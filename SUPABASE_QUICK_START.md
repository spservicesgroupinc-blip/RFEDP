# Supabase Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Fill in:
   - **Name**: RFE Foam Pro
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to you
4. Click "Create new project"

### Step 2: Get Your Credentials

1. In your Supabase dashboard, click **Settings** (left sidebar)
2. Click **API**
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### Step 3: Configure Your App

1. Create a `.env` file in your project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 4: Run Database Schema

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase_schema.sql` from your project
4. Copy **ALL** the content
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned"

✅ You should see tables appear in **Table Editor** (left sidebar)

### Step 5: Create Storage Bucket

1. In Supabase dashboard, click **Storage** (left sidebar)
2. Click **New Bucket**
3. Name it: `job_attachments`
4. Toggle **Public bucket**: OFF (keep it private)
5. Click **Create bucket**

### Step 6: Start Your App

```bash
npm install
npm run dev
```

### Step 7: Create Your First Account

1. Open your app (usually http://localhost:5173)
2. Click "Sign up" or "Don't have an account?"
3. Fill in:
   - **Company Name**: Your company name
   - **Email**: Your admin email
   - **Password**: Your admin password
4. Click "Create Account"

🎉 **You're done!** Your app is now running with Supabase.

---

## ✅ Verify Everything Works

### Check Tables
Go to Supabase → **Table Editor** → You should see:
- companies
- profiles
- customers
- inventory_items
- equipment
- company_settings
- estimates
- material_logs
- profit_loss

### Check Your User
Go to Supabase → **Authentication** → **Users**
- You should see your admin user

### Check Your Company
Go to Supabase → **Table Editor** → **companies**
- You should see your company record

### Check Your Profile
Go to Supabase → **Table Editor** → **profiles**
- You should see your profile linked to auth.users

---

## 🔧 Troubleshooting

### "Supabase not configured" error
- Make sure `.env` file exists (not `.env.example`)
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart your dev server: `Ctrl+C` then `npm run dev`

### "relation does not exist" error
- Run the SQL schema again in Supabase SQL Editor
- Make sure all tables were created successfully

### Can't login after signup
- Check your email for confirmation (if enabled)
- Check Supabase → Authentication → Users to see if user exists
- Check Supabase → Table Editor → profiles to see if profile was created

### Upload fails
- Make sure `job_attachments` storage bucket exists
- Check bucket permissions in Storage settings

---

## 📱 Create Crew Account

After logging in as admin:

1. Go to **Profile** or **Settings** in your app
2. Find "Crew Login Credentials" section
3. Enter:
   - **Crew Email**: crew@yourcompany.com
   - **Crew Password**: crewpassword123
4. Click "Create Crew Account"
5. Crew can now login with email + password

---

## 📊 Next Steps

1. **Add Customers**: Go to Customers section and add your first customer
2. **Create Estimate**: Use the calculator to create your first estimate
3. **Save Job**: Save the estimate and see it in the dashboard
4. **Test Workflow**: Move job through stages (Draft → Work Order → Invoiced → Paid)

---

## 🆘 Need Help?

### Check Logs
Go to Supabase → **Logs** to see database errors

### Check Authentication
Go to Supabase → **Authentication** → **Users** to see registered users

### Check Data
Go to Supabase → **Table Editor** to browse all your data

### Common Issues

**RLS Policy Errors:**
- Make sure RLS is enabled on all tables
- Check that policies exist (SQL Editor → Run policy checks)

**Missing Data:**
- Check that your user has a profile in the `profiles` table
- Verify `company_id` matches between tables

---

## 📚 Documentation

- [Full Setup Guide](./SUPABASE_SETUP_GUIDE.md)
- [Migration Summary](./SUPABASE_MIGRATION_SUMMARY.md)
- [Database Schema](./supabase_schema.sql)
- [Supabase Docs](https://supabase.com/docs)

---

**Welcome to Supabase! 🎉**

Your app now has:
- ✅ PostgreSQL database
- ✅ Multi-tenant security
- ✅ Real-time capabilities
- ✅ File storage
- ✅ Authentication

All managed by Supabase.
