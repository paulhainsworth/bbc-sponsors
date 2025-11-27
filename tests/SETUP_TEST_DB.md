# Setting Up Test Database

## Quick Start

1. **Create a test Supabase project** (recommended)
   - Go to https://supabase.com
   - Create a new project specifically for testing
   - This keeps test data separate from production

2. **Copy environment variables**
   - Your `.env.local` should already have `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
   - These will be used for tests automatically

3. **Run migrations on test database**
   ```bash
   # If using Supabase CLI
   supabase db push --project-ref your-test-project-ref
   
   # Or manually run migrations in Supabase Dashboard → SQL Editor
   ```

4. **Set up test users** (optional - fixtures will create them)
   - The test fixtures will automatically create test users if they don't exist
   - Or manually create them in Supabase Dashboard → Authentication → Users

5. **Set user roles**
   - After users are created, set their roles in the `profiles` table:
     ```sql
     -- For admin user
     UPDATE profiles SET role = 'super_admin' WHERE email = 'admin@test.com';
     
     -- For sponsor admin user  
     UPDATE profiles SET role = 'sponsor_admin' WHERE email = 'sponsor@test.com';
     ```

6. **Link sponsor admin to a sponsor** (for sponsor admin tests)
   ```sql
   -- Create a test sponsor
   INSERT INTO sponsors (name, slug, status) 
   VALUES ('Test Sponsor', 'test-sponsor', 'active')
   RETURNING id;
   
   -- Link sponsor admin to sponsor
   INSERT INTO sponsor_admins (sponsor_id, user_id)
   SELECT 
     s.id,
     p.id
   FROM sponsors s, profiles p
   WHERE s.name = 'Test Sponsor'
     AND p.email = 'sponsor@test.com';
   ```

## Running Tests

```bash
npm test
```

The fixtures will:
- Create test users if they don't exist
- Authenticate them automatically
- Clean up after tests (sign out)

## Using Different Test Database

If you want to use a different database for tests:

1. Create `.env.test.local` with test database credentials
2. Update `playwright.config.ts` to load `.env.test.local` instead of `.env.local`

## Troubleshooting

**"User already exists" errors:**
- The fixtures handle this automatically by trying to sign in if sign up fails
- You can manually delete test users in Supabase Dashboard if needed

**"No profile found" errors:**
- Check that profiles are being created (may need to run profile creation trigger)
- Manually create profile if needed:
  ```sql
  INSERT INTO profiles (id, email, role, display_name)
  SELECT id, email, 'sponsor_admin', split_part(email, '@', 1)
  FROM auth.users
  WHERE email = 'sponsor@test.com';
  ```

**"No sponsor associated" errors:**
- Make sure sponsor_admins table has a record linking the user to a sponsor
- See SQL above for linking sponsor admin to sponsor


