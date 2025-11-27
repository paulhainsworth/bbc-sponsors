# How to Run Diagnostic Scripts

## Location
Run all scripts from the **project root directory** in your terminal:

```bash
cd /Users/paulhainsworth/BBC-sponsor
```

## Available Scripts

### 1. Fix Sponsor Admin Links
Finds all sponsor admin users without sponsor links and attempts to auto-link them:

```bash
npx tsx scripts/fix-sponsor-admin-links.ts
```

**What it does:**
- Finds all sponsor_admin profiles
- Checks which ones don't have sponsor_admins records
- Attempts to match them to sponsors by email prefix
- Creates the missing links automatically
- Provides SQL for manual fixes if auto-link fails

### 2. Check Specific User's Link
Checks a specific user's sponsor link status:

```bash
npx tsx scripts/check-user-sponsor-link.ts <email>
```

**Example:**
```bash
npx tsx scripts/check-user-sponsor-link.ts boots-paul@mailinator.com
```

**What it does:**
- Finds the user profile
- Checks if they have a sponsor_admins record
- Shows the sponsor they're linked to (if any)
- Provides SQL to create the link if missing

## Prerequisites

1. **Environment Variables**: Make sure `.env.local` exists with:
   - `PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_SUPABASE_ANON_KEY`

2. **Dependencies**: The project should have `tsx` installed (it's in devDependencies)

## Troubleshooting

If you get errors:

1. **"Cannot find module 'tsx'":**
   ```bash
   npm install
   ```

2. **"Environment variables not set":**
   - Check that `.env.local` exists in the project root
   - Verify it contains the required Supabase credentials

3. **"User not found":**
   - The email might not exist in the database
   - Check the email spelling
   - The user might not have a profile yet

## Manual SQL Fix (Alternative)

If scripts don't work, you can run SQL directly in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to find unlinked users:
   ```sql
   SELECT p.id, p.email, p.role
   FROM profiles p
   WHERE p.role = 'sponsor_admin'
     AND NOT EXISTS (
       SELECT 1 FROM sponsor_admins sa 
       WHERE sa.user_id = p.id
     );
   ```

3. For each user, create the link:
   ```sql
   INSERT INTO sponsor_admins (sponsor_id, user_id)
   VALUES (
     (SELECT id FROM sponsors WHERE name ILIKE '%<sponsor_name>%' LIMIT 1),
     '<user_id_from_step_2>'
   )
   ON CONFLICT (sponsor_id, user_id) DO NOTHING;
   ```


