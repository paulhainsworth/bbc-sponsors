# BBC Sponsor App - Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your Supabase credentials.

3. **Set Up Supabase Database**
   - Create a new Supabase project at https://supabase.com
   - Copy your project URL and anon key to `.env.local`
   - Run migrations:
   ```bash
   npm run db:migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Initial Setup Steps

### 1. Create First Super Admin

**Step-by-step process:**

1. **Sign up via the app:**
   - Go to `http://localhost:5173/auth/login`
   - Enter your email address
   - Click "Send Magic Link"
   - Check your email and click the magic link to sign in

2. **Get your User UUID:**
   - Go to Supabase Dashboard → Authentication → Users
   - Find your email in the list
   - Copy the User UID (UUID)

3. **Create your admin profile:**
   - Go to Supabase SQL Editor
   - Run this SQL (replace with your values):

```sql
INSERT INTO profiles (id, email, role, display_name)
VALUES (
  'YOUR_USER_UUID_HERE',  -- Paste UUID from step 2
  'your-email@example.com',  -- Your email
  'super_admin',
  'Your Name'  -- Your display name
);
```

4. **Refresh the app:**
   - Refresh your browser
   - You should now see the "Admin" link in the header

**Alternative:** Use the helper script in `scripts/create-admin.sql` - just replace the placeholder values and run it.

### 2. Configure Slack (Optional)

1. Create a Slack Incoming Webhook in your Slack workspace
2. In the admin dashboard, go to Settings
3. Enter your webhook URL
4. Configure notification preferences

### 3. Create Your First Sponsor

1. Log in as super admin
2. Go to Admin > Sponsors
3. Click "Add New Sponsor"
4. Fill in sponsor details and send invitation

## Database Migrations

The database schema is defined in `supabase/migrations/`:

- `001_initial_schema.sql` - Creates all tables and indexes
- `002_functions_and_triggers.sql` - Database functions and triggers
- `003_rls_policies.sql` - Row Level Security policies

To apply migrations manually in Supabase:
1. Go to SQL Editor in Supabase dashboard
2. Run each migration file in order

## Storage Buckets

Create the following public storage buckets in Supabase:

1. **sponsor-logos** - For sponsor logo images
2. **sponsor-banners** - For sponsor banner images
3. **blog-images** - For blog post featured images
4. **profile-avatars** - For user profile pictures

Set all buckets to public with appropriate file size limits.

## Deployment to Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The cron job for expiring promotions will automatically be set up via `vercel.json`.

## Troubleshooting

### Authentication Issues
- Ensure Supabase Auth is enabled
- Check that redirect URLs are configured in Supabase Auth settings
- Verify environment variables are set correctly

### Database Issues
- Check that RLS policies are applied correctly
- Verify that all migrations have been run
- Check Supabase logs for errors

### Image Upload Issues
- Verify storage buckets exist and are public
- Check file size limits
- Ensure proper CORS configuration

## Next Steps

After initial setup:
1. Create your first sponsor
2. Set up sponsor admin accounts
3. Create test promotions
4. Configure Slack notifications
5. Create your first blog post

