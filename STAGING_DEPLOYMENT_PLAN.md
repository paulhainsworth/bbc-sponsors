# Staging Deployment Plan

## Overview

This plan outlines the steps to deploy the BBC Sponsor App to a staging environment on Vercel, including database setup, environment configuration, and verification steps.

## Prerequisites

- [ ] GitHub repository with code pushed
- [ ] Vercel account (free tier is sufficient)
- [ ] Supabase account (create a separate staging project)
- [ ] Access to production Supabase project (for reference)

## Phase 1: Supabase Staging Database Setup

### 1.1 Create Staging Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `bbc-sponsor-staging`
4. Database Password: Generate and save securely
5. Region: Choose closest to your users
6. Wait for project to be created (~2 minutes)

### 1.2 Run Database Migrations

1. **Get Supabase CLI credentials:**
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   ```

2. **Link to staging project:**
   ```bash
   # Get your project reference from Supabase dashboard
   # Project Settings → General → Reference ID
   supabase link --project-ref YOUR_STAGING_PROJECT_REF
   ```

3. **Run migrations:**
   ```bash
   # Push all migrations to staging
   supabase db push
   
   # OR manually run each migration in Supabase SQL Editor:
   # - 001_initial_schema.sql
   # - 002_functions_and_triggers.sql
   # - 003_rls_policies.sql
   # - 004_fix_sponsor_admin_links.sql
   ```

### 1.3 Create Storage Buckets

In Supabase Dashboard → Storage, create these public buckets:

1. **sponsor-logos**
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

2. **sponsor-banners**
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

3. **blog-images**
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

4. **profile-avatars**
   - Public: Yes
   - File size limit: 2MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

### 1.4 Configure Supabase Auth Settings

1. Go to Authentication → URL Configuration
2. **Site URL**: `https://your-staging-app.vercel.app`
3. **Redirect URLs**: Add:
   - `https://your-staging-app.vercel.app/auth/callback`
   - `https://your-staging-app.vercel.app/auth/accept-invitation`
   - `http://localhost:5173/auth/callback` (for local testing)

4. **Email Templates**: (Optional) Customize for staging
   - Magic Link template
   - Invitation template

### 1.5 Create Initial Super Admin

1. **Sign up via staging app:**
   - Navigate to staging URL
   - Go to `/auth/login`
   - Enter your email
   - Click "Send Magic Link"
   - Complete sign-in

2. **Get User UUID:**
   - Supabase Dashboard → Authentication → Users
   - Find your email
   - Copy the User UID

3. **Create admin profile:**
   ```sql
   INSERT INTO profiles (id, email, role, display_name)
   VALUES (
     'YOUR_USER_UUID_HERE',
     'your-email@example.com',
     'super_admin',
     'Your Name'
   );
   ```

## Phase 2: Vercel Deployment Setup

### 2.1 Update SvelteKit Adapter for Vercel

**Important**: The project currently uses `@sveltejs/adapter-node`, but Vercel requires `@sveltejs/adapter-vercel`.

1. **Update `svelte.config.js`:**
   ```javascript
   import adapter from '@sveltejs/adapter-vercel';
   import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

   /** @type {import('@sveltejs/kit').Config} */
   const config = {
     preprocess: vitePreprocess(),
     kit: {
       adapter: adapter()
     }
   };

   export default config;
   ```

2. **Verify adapter is installed:**
   ```bash
   npm list @sveltejs/adapter-vercel
   ```
   
   If not installed, it's already in `package.json` devDependencies, so just run:
   ```bash
   npm install
   ```

3. **Test build locally:**
   ```bash
   npm run build
   ```
   
   This should complete without errors.

### 2.2 Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: SvelteKit (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.svelte-kit` (auto-detected)
   - **Install Command**: `npm install` (default)

### 2.3 Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

#### Required Public Variables

```
PUBLIC_SUPABASE_URL=https://YOUR_STAGING_PROJECT_REF.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
PUBLIC_APP_URL=https://your-staging-app.vercel.app
```

**Note**: `PUBLIC_APP_URL` is used for invitation links and Slack notifications. Update this after you know your Vercel URL.

#### Required Private Variables

```
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key
```

#### Optional Variables (if using Slack)

```
SLACK_WEBHOOK_URL=your_slack_webhook_url
SLACK_WEBHOOK_SECRET_KEY=your_secret_key
```

#### Optional Variables (for Cron Job)

```
CRON_SECRET=generate_random_secret_key
```


**Note**: Set these for:
- ✅ Production
- ✅ Preview
- ✅ Development (optional, for local testing)

### 2.4 Configure Build Settings

1. **Node.js Version**: 18.x or higher
2. **Build Command**: `npm run build` (default)
3. **Output Directory**: `.svelte-kit` (auto-detected)

### 2.5 Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for build to complete (~2-3 minutes)
3. Note the deployment URL (e.g., `bbc-sponsor-staging.vercel.app`)

## Phase 3: Post-Deployment Configuration

### 3.1 Update Supabase Redirect URLs

1. Go back to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL** with actual Vercel URL
3. Update **Redirect URLs** with actual Vercel URLs

### 3.2 Verify Cron Job

The cron job is configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/expire-promotions",
    "schedule": "0 * * * *"
  }]
}
```

Vercel will automatically set this up. Verify in:
- Vercel Dashboard → Project → Settings → Cron Jobs

### 3.3 Test Authentication Flow

1. **Magic Link Login:**
   - Go to `/auth/login`
   - Enter email
   - Check email for magic link
   - Click link and verify redirect

2. **Session Persistence:**
   - Log in
   - Navigate between pages (`/admin`, `/sponsor-admin`, etc.)
   - Verify session persists (no unexpected logouts)
   - Refresh page - should stay logged in

### 3.4 Test Core Functionality

#### Admin Features
- [ ] Access `/admin` dashboard
- [ ] Create a test sponsor
- [ ] Send sponsor invitation email
- [ ] View sponsor list
- [ ] Edit sponsor details

#### Sponsor Admin Features
- [ ] Accept invitation (use test email)
- [ ] Access `/sponsor-admin` dashboard
- [ ] View sponsor profile
- [ ] Create a test promotion
- [ ] Edit promotion

#### Public Features
- [ ] View `/` homepage
- [ ] Browse `/sponsors` page
- [ ] View individual sponsor page
- [ ] View `/news` page

### 3.5 Test API Endpoints

1. **Cron Endpoint** (if CRON_SECRET is set):
   ```bash
   curl -X POST https://your-staging-app.vercel.app/api/cron/expire-promotions \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Slack Notification** (if configured):
   - Create a promotion as admin
   - Verify Slack notification is sent

## Phase 4: Verification Checklist

### Database
- [ ] All migrations applied successfully
- [ ] All storage buckets created
- [ ] RLS policies active
- [ ] Test data can be inserted/queried

### Authentication
- [ ] Magic link login works
- [ ] Session persists across page navigations
- [ ] Session persists after page refresh
- [ ] Logout works correctly
- [ ] Redirect URLs configured correctly

### Authorization
- [ ] Super admin can access `/admin`
- [ ] Sponsor admin can access `/sponsor-admin`
- [ ] Unauthenticated users redirected to login
- [ ] Role-based access control works

### Functionality
- [ ] Sponsor creation works
- [ ] Invitation emails sent
- [ ] Invitation acceptance works
- [ ] Promotion creation works
- [ ] Image uploads work (if tested)
- [ ] Cron job executes (check logs)

### Performance
- [ ] Page load times acceptable
- [ ] No console errors
- [ ] No network errors
- [ ] Images load correctly

## Phase 5: Monitoring & Maintenance

### 5.1 Set Up Monitoring

1. **Vercel Analytics** (if enabled):
   - Monitor page views
   - Track errors
   - Check performance metrics

2. **Supabase Dashboard**:
   - Monitor database usage
   - Check auth logs
   - Review API usage

3. **Error Tracking** (Optional):
   - Consider adding Sentry or similar
   - Monitor for production errors

### 5.2 Regular Maintenance

1. **Database Backups:**
   - Supabase automatically backs up daily
   - Verify backup retention policy

2. **Environment Variables:**
   - Rotate secrets periodically
   - Update if Supabase keys change

3. **Dependencies:**
   - Keep npm packages updated
   - Review security advisories

## Troubleshooting

### Common Issues

#### "Missing Supabase environment variables"
- **Solution**: Verify all environment variables are set in Vercel dashboard
- Check that variable names match exactly (case-sensitive)

#### "Redirect URL mismatch"
- **Solution**: Update Supabase Auth → URL Configuration
- Ensure Site URL and Redirect URLs match Vercel domain

#### "RLS policy violation"
- **Solution**: Verify all migrations ran successfully
- Check Supabase logs for specific policy errors
- Ensure user profiles exist for authenticated users

#### "Cron job not running"
- **Solution**: Verify `vercel.json` is in root directory
- Check Vercel dashboard → Cron Jobs
- Verify `CRON_SECRET` is set and matches in API route

#### "Session not persisting"
- **Solution**: Verify Supabase redirect URLs include staging domain
- Check browser console for auth errors
- Verify cookies are being set correctly

## Rollback Plan

If staging deployment has critical issues:

1. **Revert Vercel Deployment:**
   - Go to Vercel Dashboard → Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Database Rollback:**
   - If migrations caused issues, restore from backup
   - Supabase Dashboard → Database → Backups

3. **Environment Variables:**
   - Revert to previous values if needed
   - Vercel Dashboard → Settings → Environment Variables

## Next Steps After Staging

Once staging is verified:

1. **Document any issues found**
2. **Fix issues in development**
3. **Re-test in staging**
4. **Prepare production deployment** (similar process with production Supabase project)

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **SvelteKit Docs**: https://kit.svelte.dev/docs
- **Project README**: `/README.md`
- **Setup Guide**: `/SETUP.md`

