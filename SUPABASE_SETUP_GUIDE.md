# Supabase Setup Guide for RFE Foam Pro

This guide walks you through setting up Supabase for authentication and database tables.

## Quick Start

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project named "RFE Foam Pro"
3. Save your project credentials (URL and anon key)

### Step 2: Run the SQL Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase_schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

This will create:
- ✅ All database tables (companies, profiles, customers, inventory, equipment, estimates, etc.)
- ✅ Row Level Security (RLS) policies for multi-tenant isolation
- ✅ Authentication functions
- ✅ Triggers for automatic updates
- ✅ Indexes for performance

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env` (or `.env.local`):
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   You can find these in:
   - Supabase Dashboard → **Settings** → **API**

### Step 4: Create Storage Bucket (for Phase 4)

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**
3. Name it: `job_attachments`
4. Set to **Private** (RLS will control access)
5. Click **Create**

Alternatively, run this SQL in the SQL Editor:
```sql
insert into storage.buckets (id, name, public) values 
  ('job_attachments', 'job_attachments', false);
```

## Testing Authentication

### Create Your First Admin User

You can test signup using the `signupUser` function from `src/services/supabase.ts`:

```typescript
import { signupUser } from './services/supabase';

const result = await signupUser({
  email: 'admin@yourcompany.com',
  password: 'secure-password',
  fullName: 'John Doe',
  companyName: 'Your Foam Company',
});

if (result.error) {
  console.error('Signup failed:', result.error);
} else {
  console.log('User created:', result.user);
  console.log('Profile:', result.profile);
}
```

### Create Crew Members

Admin users can create crew members by:

1. Creating an auth user via Supabase dashboard or API
2. Inserting a profile with `role = 'crew'` and a 4-digit `crew_pin`

Example SQL:
```sql
-- After creating auth user, add their profile
insert into profiles (id, company_id, role, full_name, email, crew_pin)
values 
  ('USER_ID_FROM_AUTH', 'YOUR_COMPANY_ID', 'crew', 'Jane Crew', 'jane@company.com', '1234');
```

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `companies` | Multi-tenant root - each company has isolated data |
| `profiles` | Links Supabase auth.users to companies with roles |
| `customers` | CRM customer records |
| `inventory_items` | Warehouse inventory tracking |
| `equipment` | Equipment tracking |
| `company_settings` | Company configuration (JSONB) |
| `estimates` | Estimate/job pipeline records |
| `material_logs` | Material usage tracking |
| `profit_loss` | Financial records |

### Authentication Flow

```
User Signup → auth.users → profiles → companies
                ↓
         RLS Policies
                ↓
         Multi-tenant isolation
```

### Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only access data from their own company
- Company isolation is enforced at the database level
- No data leakage between tenants

## Security Best Practices

1. **Never expose service role key** in frontend code
2. **Use RLS policies** - they're already configured
3. **Validate on client and server** - RLS is your last line of defense
4. **Use strong passwords** - enforce password requirements
5. **Enable email confirmation** in Supabase dashboard (optional)

## Migration from Google Apps Script

See `SUPABASE_MIGRATION_PLAN.md` for the complete migration roadmap:

- ✅ **Phase 1**: Supabase Setup & Authentication (THIS FILE)
- ⏳ **Phase 2**: Core Table Migration
- ⏳ **Phase 3**: Transactional Entities
- ⏳ **Phase 4**: Storage Migration
- ⏳ **Phase 5**: API Layer Rewrite
- ⏳ **Phase 6**: Data Migration

## Troubleshooting

### "permission denied for table"
- Check that RLS policies are enabled
- Verify user has a profile in the `profiles` table
- Ensure `company_id` matches

### "relation does not exist"
- Run the SQL schema in Supabase SQL Editor
- Check table names are correct (case-sensitive)

### Authentication not working
- Verify `.env` has correct Supabase URL and anon key
- Check browser console for errors
- Ensure user exists in `auth.users` and `profiles`

## Next Steps

1. ✅ Run SQL schema
2. ✅ Configure environment variables
3. ✅ Test authentication signup/login
4. 📋 Proceed to Phase 2: Core Table Migration
5. 📋 Integrate auth service into React components

## Useful Supabase Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Best Practices](https://supabase.com/docs/guides/auth/best-practices)
