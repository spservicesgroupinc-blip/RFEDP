# AI Agent Plan: Google Apps Script to Supabase Migration

## Overview
This document serves as the master checklist and architectural blueprint for migrating "RFE Foam Pro" from a Google Apps Script / Google Sheets backend to a robust, relational PostgreSQL database using Supabase.

AI Agents working on this in the future: Treat these phases sequentially. Check off the items as they are completed. Do not move to the next phase without finalizing testing for the current phase.

---

## Phase 1: Supabase Setup & Authentication (The Foundation)
**Goal:** Establish the `companies` and `users` tables, implement Row Level Security (RLS) for multi-tenancy architecture, and port over login functionality for Admins and Crews.

### 1.1 Supabase Project Initialization
- [ ] Connect the application to a Supabase project instance (via `.env.local` configuring `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- [ ] Uncomment/finalize `src/services/supabase.ts` initialization logic.

### 1.2 Multi-Tenant Core Schema (`public` schema)
Execute the following SQL commands in Supabase SQL Editor:
- [ ] Create `companies` table.
  - Columns: `id` (uuid, pk), `name` (text), `created_at` (timestamptz)
- [ ] Create `profiles` table (links to Supabase `auth.users`).
  - Columns: `id` (uuid, references `auth.users`), `company_id` (uuid, references `companies`), `role` (text - 'admin' or 'crew'), `crew_pin` (text, nullable), `created_at` (timestamptz).

### 1.3 Row Level Security (RLS) Configuration
- [ ] Enable RLS on `companies` and `profiles`.
- [ ] Create RLS Policy: Users can only select/insert/update rows where `company_id` matches their profile's `company_id`.

### 1.4 Refactoring Auth Logic (`services/api.ts` -> `supabase.ts`)
- [ ] Implement `loginUser` using `supabase.auth.signInWithPassword`.
- [ ] Implement `signupUser` with `supabase.auth.signUp()`, combined with an RPC or trigger to create the `companies` record explicitly.
- [ ] Implement `loginCrew`: Crews can log in via a generic company email + password under the hood, followed by an immediate PIN verification check mapped against the `profiles.crew_pin` before allowing dashboard access. Alternatively, maintain a custom crew PIN auth flow using an Edge Function.

---

## Phase 2: Core Table Migration (Entities)
**Goal:** Migrate the basic disconnected tab data into relational tables. Every table below **must** feature a `company_id` column to enforce RLS.

### 2.1 Schema Definition
- [ ] **`customers` table**
  - Columns: `id` (uuid), `company_id` (uuid), `name`, `address_line1`, `address_line2`, `city`, `state`, `zip`, `phone`, `email`, `status` (text), `created_at`.
- [ ] **`inventory_items` table**
  - Columns: `id`, `company_id`, `name`, `quantity` (numeric), `unit`, `unit_cost` (numeric), `created_at`.
- [ ] **`equipment` table**
  - Columns: `id`, `company_id`, `name`, `status`, `created_at`.
- [ ] **`company_settings` table**
  - Columns: `id`, `company_id`, `costs_json` (jsonb), `yields_json` (jsonb), `warehouse_counts` (jsonb - tracks open/closed cell sets), `lifetime_usage` (jsonb).

### 2.2 RLS Execution
- [ ] Enable RLS on all tables from 2.1.
- [ ] Attach the standard Multi-tenant policy: `(company_id = auth.uid() -> profile.company_id)`.

---

## Phase 3: Transactional Entities Migration
**Goal:** Replace the complex delta logic inside `backend/Code.js` with structured relational SQL logic, and leverage Supabase Postgres Functions / Triggers for atomic updates.

### 3.1 Estimates & Invoices (`estimates` table)
- [ ] Create `estimates` table.
  - Columns: `id` (uuid), `company_id` (uuid), `customer_id` (uuid, references `customers`), `date` (date), `status` (text), `execution_status` (text), `total_value` (numeric), `material_cost` (numeric), `invoice_number` (text), `calculation_snapshot` (jsonb - saves the full calculator inputs/results to preserve the exact job math), `created_at`, `updated_at`.

### 3.2 Material Logs & Financials
- [ ] Create `material_logs` table (replaces Daily Crew Log & `Material_Log_DB`).
  - Columns: `id`, `company_id`, `estimate_id` (uuid), `material_name`, `quantity`, `unit`, `logged_by_id` (uuid, references `profiles`), `date`.
- [ ] Create `profit_loss` table.
  - Columns: `id`, `company_id`, `estimate_id`, `revenue`, `cogs`, `net_profit`, `margin`, `date_paid`.

### 3.3 Database Triggers for Inventory Deductions
- [ ] Write a Postgres Function / Trigger for `COMPLETE_JOB`:
  - When an estimate changes `execution_status` to 'Completed', automatically deduct standard inventory quantities from the `inventory_items` table and foam sets from the `company_settings` table. *This replaces the Google App Script locks / loop logic locking in `Code.js`.*

---

## Phase 4: Storage Migration (Google Drive -> Supabase Storage)
**Goal:** Migrate PDF and Image hosting over to Supabase native Storage.

### 4.1 Supabase Storage Setup
- [ ] Create a storage bucket `job_attachments`.
- [ ] Apply RLS to the bucket enforcing `company_id` isolation (e.g., folder paths segmented by `company_id/`).

### 4.2 Application Logic Refactor
- [ ] Update `savePdfToDrive` in `services/api.ts` to utilize `supabase.storage.from('job_attachments').upload()`.
- [ ] Update `uploadImage` similarly for crew site photos.
- [ ] Update frontend references to pull Public URLs or Signed URLs via Supabase SDK instead of Google Drive links.

---

## Phase 5: Hook & API Layer Re-Write
**Goal:** Fully decouple the UI from `GOOGLE_SCRIPT_URL` endpoints.

### 5.1 Refactor Data Hooks (`hooks/useEstimates.ts` & `hooks/useSync.ts`)
- [ ] Deprecate the massive `syncUp` and `syncDown` delta logic which fetched entire JSON payloads.
- [ ] Implement robust `React Query` hooks or `useEffect` fetchers natively calling Supabase (e.g., `const { data } = await supabase.from('estimates').select('*')`).
- [ ] Allow the UI to perform precise CRUD operations instead of generic full-state syncs (e.g., `updateEstimateStatus()`, `insertMaterialLog()`).

---

## Phase 6: Final Data Migration Protocol
**Goal:** Scripts to perform a 1-time port of the historical data from Google Sheets into the new production Supabase DB.

### 6.1 Migration Scripting
- [ ] Write a one-time Node.js script leveraging the Google Sheets API and Supabase JS Client.
- [ ] **Execution Order:**
  1. Pull Users -> Create Supabase Auth Accounts / Company Profiles.
  2. Pull Customers -> Insert into `customers`.
  3. Pull Inventory -> Insert into `inventory_items`.
  4. Pull Estimates -> Insert into `estimates` (mapping string identifiers to new UUID relationships).
  5. Pull Logs & P&L -> Insert into respective tables.

---

**Execution Readiness:** 
When an AI agent picks this up, begin explicitly at Phase 1.1. Do not leap into the application code (Phase 5) until the entire Supabase Architecture (Phases 1-3) is configured and tested via the Supabase Dashboard/SQL Editor.
