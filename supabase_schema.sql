-- RFE Foam Pro - Supabase Database Schema
-- Phase 1 & 2: Core Tables and Authentication
-- Execute this in Supabase SQL Editor

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================
-- User roles
create type user_role as enum ('admin', 'crew');

-- Customer status
create type customer_status as enum ('lead', 'active', 'archived');

-- Estimate status (pipeline stages)
create type estimate_status as enum ('draft', 'work_order', 'invoiced', 'paid', 'archived');

-- Execution status (for crew tracking)
create type execution_status as enum ('not_started', 'in_progress', 'completed');

-- Equipment status
create type equipment_status as enum ('available', 'in_use', 'maintenance', 'retired');

-- ============================================================================
-- CORE TABLES (Phase 1)
-- ============================================================================

-- Companies table (multi-tenant root)
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles table (links to Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  role user_role not null default 'admin',
  crew_pin text null,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure crew_pin is unique within company
  constraint unique_crew_pin_per_company unique (company_id, crew_pin),
  -- Ensure crew_pin is only set for crew members
  constraint crew_pin_only_for_crew check (
    (role = 'crew' and crew_pin is not null) or
    (role = 'admin' and crew_pin is null)
  )
);

-- ============================================================================
-- CORE ENTITY TABLES (Phase 2)
-- ============================================================================

-- Customers table
create table customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  status customer_status not null default 'lead',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventory items table
create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  category text not null default 'general', -- 'open_cell', 'closed_cell', 'supplementary'
  quantity numeric not null default 0,
  unit text not null default 'sets', -- 'sets', 'board_feet', 'units', etc.
  unit_cost numeric not null default 0,
  min_quantity numeric default 0, -- for low stock alerts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equipment table
create table equipment (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  type text, -- 'spray_rig', 'generator', 'heater', etc.
  status equipment_status not null default 'available',
  serial_number text,
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Company settings table (stores configuration as JSONB)
create table company_settings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade unique,
  costs_json jsonb not null default '{}', -- material costs configuration
  yields_json jsonb not null default '{}', -- foam yield configurations
  warehouse_counts jsonb not null default '{}', -- open/closed cell set counts
  lifetime_usage jsonb not null default '{}', -- lifetime material usage tracking
  pricing_defaults jsonb not null default '{}', -- default pricing per sqft/level
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TRANSACTIONAL TABLES (Phase 3)
-- ============================================================================

-- Estimates table
create table estimates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  estimate_number text not null,
  date date not null default current_date,
  status estimate_status not null default 'draft',
  execution_status execution_status not null default 'not_started',
  
  -- Calculation inputs (preserved snapshot)
  calculation_snapshot jsonb not null default '{}',
  
  -- Financials
  total_value numeric not null default 0,
  material_cost numeric not null default 0,
  labor_cost numeric not null default 0,
  retail_price numeric not null default 0,
  
  -- Invoice tracking
  invoice_number text,
  invoice_date date,
  
  -- Job details
  job_address_line1 text,
  job_address_line2 text,
  job_city text,
  job_state text,
  job_zip text,
  
  -- Notes
  internal_notes text,
  customer_notes text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Material logs table (tracks actual material usage)
create table material_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  estimate_id uuid not null references estimates(id) on delete cascade,
  material_name text not null,
  material_category text not null, -- 'open_cell', 'closed_cell', 'supplementary'
  quantity numeric not null,
  unit text not null,
  logged_by_id uuid not null references profiles(id),
  log_date date not null default current_date,
  log_type text not null default 'usage', -- 'usage', 'adjustment', 'return'
  notes text,
  created_at timestamptz not null default now()
);

-- Profit & Loss table
create table profit_loss (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  estimate_id uuid not null references estimates(id),
  revenue numeric not null default 0,
  cogs numeric not null default 0, -- cost of goods sold
  labor_cost numeric not null default 0,
  additional_costs numeric not null default 0,
  net_profit numeric not null default 0,
  margin_percent numeric not null default 0,
  date_paid date,
  quarter text, -- e.g., '2024-Q1'
  year integer,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles
create index idx_profiles_company_id on profiles(company_id);
create index idx_profiles_role on profiles(role);

-- Customers
create index idx_customers_company_id on customers(company_id);
create index idx_customers_status on customers(status);

-- Inventory
create index idx_inventory_company_id on inventory_items(company_id);
create index idx_inventory_category on inventory_items(category);

-- Equipment
create index idx_equipment_company_id on equipment(company_id);
create index idx_equipment_status on equipment(status);

-- Estimates
create index idx_estimates_company_id on estimates(company_id);
create index idx_estimates_customer_id on estimates(customer_id);
create index idx_estimates_status on estimates(status);
create index idx_estimates_execution_status on estimates(execution_status);
create index idx_estimates_date on estimates(date);

-- Material logs
create index idx_material_logs_company_id on material_logs(company_id);
create index idx_material_logs_estimate_id on material_logs(estimate_id);
create index idx_material_logs_date on material_logs(log_date);

-- Profit & Loss
create index idx_profit_loss_company_id on profit_loss(company_id);
create index idx_profit_loss_estimate_id on profit_loss(estimate_id);
create index idx_profit_loss_year on profit_loss(year);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table companies enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table inventory_items enable row level security;
alter table equipment enable row level security;
alter table company_settings enable row level security;
alter table estimates enable row level security;
alter table material_logs enable row level security;
alter table profit_loss enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper function to get user's company_id
create or replace function get_user_company_id()
returns uuid as $$
begin
  return (
    select company_id 
    from profiles 
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Companies: Users can only see their own company
create policy "Users can view own company"
  on companies for select
  using (id = get_user_company_id());

create policy "Users can update own company"
  on companies for update
  using (id = get_user_company_id());

-- Profiles: Users can view profiles in their company
create policy "Users can view company profiles"
  on profiles for select
  using (company_id = get_user_company_id());

create policy "Users can insert own profile"
  on profiles for insert
  with check (id = auth.uid() AND company_id = get_user_company_id());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

-- Customers: Multi-tenant isolation
create policy "Users can view company customers"
  on customers for select
  using (company_id = get_user_company_id());

create policy "Users can insert company customers"
  on customers for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company customers"
  on customers for update
  using (company_id = get_user_company_id());

create policy "Users can delete company customers"
  on customers for delete
  using (company_id = get_user_company_id());

-- Inventory: Multi-tenant isolation
create policy "Users can view company inventory"
  on inventory_items for select
  using (company_id = get_user_company_id());

create policy "Users can insert company inventory"
  on inventory_items for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company inventory"
  on inventory_items for update
  using (company_id = get_user_company_id());

create policy "Users can delete company inventory"
  on inventory_items for delete
  using (company_id = get_user_company_id());

-- Equipment: Multi-tenant isolation
create policy "Users can view company equipment"
  on equipment for select
  using (company_id = get_user_company_id());

create policy "Users can insert company equipment"
  on equipment for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company equipment"
  on equipment for update
  using (company_id = get_user_company_id());

create policy "Users can delete company equipment"
  on equipment for delete
  using (company_id = get_user_company_id());

-- Company settings: Multi-tenant isolation
create policy "Users can view company settings"
  on company_settings for select
  using (company_id = get_user_company_id());

create policy "Users can insert company settings"
  on company_settings for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company settings"
  on company_settings for update
  using (company_id = get_user_company_id());

-- Estimates: Multi-tenant isolation
create policy "Users can view company estimates"
  on estimates for select
  using (company_id = get_user_company_id());

create policy "Users can insert company estimates"
  on estimates for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company estimates"
  on estimates for update
  using (company_id = get_user_company_id());

create policy "Users can delete company estimates"
  on estimates for delete
  using (company_id = get_user_company_id());

-- Material logs: Multi-tenant isolation
create policy "Users can view company material logs"
  on material_logs for select
  using (company_id = get_user_company_id());

create policy "Users can insert company material logs"
  on material_logs for insert
  with check (company_id = get_user_company_id());

-- Profit & Loss: Multi-tenant isolation
create policy "Users can view company profit_loss"
  on profit_loss for select
  using (company_id = get_user_company_id());

create policy "Users can insert company profit_loss"
  on profit_loss for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company profit_loss"
  on profit_loss for update
  using (company_id = get_user_company_id());

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at
create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_customers_updated_at before update on customers
  for each row execute function update_updated_at_column();

create trigger update_inventory_items_updated_at before update on inventory_items
  for each row execute function update_updated_at_column();

create trigger update_equipment_updated_at before update on equipment
  for each row execute function update_updated_at_column();

create trigger update_company_settings_updated_at before update on company_settings
  for each row execute function update_updated_at_column();

create trigger update_estimates_updated_at before update on estimates
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC INVENTORY DEDUCTION (Phase 3)
-- ============================================================================

-- Function to handle job completion and inventory deduction
create or replace function complete_job_inventory_deduction()
returns trigger as $$
begin
  -- Only trigger when execution_status changes to 'completed'
  if new.execution_status = 'completed' 
    and (old.execution_status is null or old.execution_status != 'completed') then
    
    -- Deduct foam sets from company_settings.warehouse_counts
    -- This is handled in application logic or via more complex trigger
    -- For now, we log the completion event
    
    -- Insert a record into material_logs for tracking
    insert into material_logs (
      company_id,
      estimate_id,
      material_name,
      material_category,
      quantity,
      unit,
      logged_by_id,
      log_type,
      notes
    )
    values (
      new.company_id,
      new.id,
      'Job Completion',
      'tracking',
      0,
      'event',
      auth.uid(),
      'completion',
      'Job marked as completed - inventory deduction pending'
    );
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger for automatic inventory deduction on job completion
create trigger on_estimate_completed
  after update on estimates
  for each row
  when (new.execution_status = 'completed' 
    and (old.execution_status is null or old.execution_status != 'completed'))
  execute function complete_job_inventory_deduction();

-- ============================================================================
-- FUNCTIONS FOR AUTHENTICATION
-- ============================================================================

-- Function to create a new user profile (called after signup)
create or replace function create_user_profile(
  p_user_id uuid,
  p_company_id uuid,
  p_role user_role,
  p_full_name text,
  p_email text,
  p_crew_pin text default null
)
returns void as $$
begin
  insert into profiles (id, company_id, role, full_name, email, crew_pin)
  values (p_user_id, p_company_id, p_role, p_full_name, p_email, p_crew_pin);
end;
$$ language plpgsql security definer;

-- Function to create a new company
create or replace function create_new_company(p_company_name text)
returns uuid as $$
declare
  v_company_id uuid;
begin
  insert into companies (name) values (p_company_name)
  returning id into v_company_id;
  return v_company_id;
end;
$$ language plpgsql security definer;

-- Function to verify crew PIN
create or replace function verify_crew_pin(p_email text, p_pin text)
returns table (
  user_id uuid,
  company_id uuid,
  full_name text,
  role user_role
) as $$
begin
  return query
  select p.id, p.company_id, p.full_name, p.role
  from profiles p
  where p.email = p_email
    and p.crew_pin = p_pin
    and p.role = 'crew';
end;
$$ language plpgsql security definer;

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert test data
-- 
-- -- Create a test company
-- insert into companies (id, name) values 
--   ('00000000-0000-0000-0000-000000000001', 'Test Foam Company');
-- 
-- -- Create test inventory items
-- insert into inventory_items (company_id, name, category, quantity, unit, unit_cost) values
--   ('00000000-0000-0000-0000-000000000001', 'Open Cell Foam Set', 'open_cell', 10, 'sets', 450.00),
--   ('00000000-0000-0000-0000-000000000001', 'Closed Cell Foam Set', 'closed_cell', 5, 'sets', 650.00),
--   ('00000000-0000-0000-0000-000000000001', 'Scaffolding', 'supplementary', 20, 'units', 25.00);
-- 
-- -- Create test company settings
-- insert into company_settings (company_id, costs_json, yields_json, warehouse_counts) values
--   ('00000000-0000-0000-0000-000000000001', 
--    '{"open_cell": 450, "closed_cell": 650}',
--    '{"open_cell_yield": 1200, "closed_cell_yield": 400}',
--    '{"open_cell_sets": 10, "closed_cell_sets": 5}');

-- ============================================================================
-- STORAGE BUCKET SETUP (Phase 4)
-- ============================================================================

-- Create storage bucket for job attachments
-- Note: This needs to be run separately or via Supabase Dashboard
-- 
-- insert into storage.buckets (id, name, public) values 
--   ('job_attachments', 'job_attachments', false);
-- 
-- -- RLS policies for storage
-- create policy "Users can upload to their company folder"
--   on storage.objects for insert
--   with check (bucket_id = 'job_attachments' 
--     and (storage.foldername(name))[1] = get_user_company_id()::text);
-- 
-- create policy "Users can view their company folder"
--   on storage.objects for select
--   using (bucket_id = 'job_attachments' 
--     and (storage.foldername(name))[1] = get_user_company_id()::text);
-- 
-- create policy "Users can delete their company files"
--   on storage.objects for delete
--   using (bucket_id = 'job_attachments' 
--     and (storage.foldername(name))[1] = get_user_company_id()::text);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
