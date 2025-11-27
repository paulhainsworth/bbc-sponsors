# Sponsor Admin Link Investigation Report

## Problem

Users are seeing "No sponsor associated with your account" errors when accessing sponsor admin pages. The error appears on:
- Dashboard (`/sponsor-admin`)
- Profile page (`/sponsor-admin/profile`)
- Team page (`/sponsor-admin/team`)

## Root Cause

After investigation, I found that:

1. **The fix script reports all users are linked** - This means the `sponsor_admins` records exist in the database when queried with the service role key (bypasses RLS).

2. **But users still see the error** - This suggests one of these issues:
   - The RLS policy is preventing the query from working
   - The query is running before the user profile is loaded
   - The user's session/auth.uid() doesn't match the user_id in sponsor_admins

## Why Tests Didn't Catch This

1. **Test Setup Creates Links**: The test setup script (`tests/setup/auth.setup.ts`) calls `ensureSponsorLink()` which creates the link using the service role key, bypassing RLS. This ensures test users always have links.

2. **Test Users Are Pre-Authenticated**: Test fixtures use `storageState` which includes a fully authenticated session, so `auth.uid()` always matches.

3. **No Real User Flow Test**: Tests don't simulate the actual invitation acceptance flow that real users go through, where:
   - User receives email
   - User clicks magic link
   - User is authenticated
   - Invitation is accepted
   - Sponsor link is created

4. **RLS Policy Works in Tests**: Because test users are created with the service role key and have proper sessions, the RLS policy `auth.uid() = user_id` works correctly in tests.

## The Actual Issue

The most likely scenario is that **real users were created through the invitation flow, but the sponsor link creation failed silently** or **the invitation didn't have a sponsor_id set**. 

Looking at the code:
- `/api/invitations/accept` does create the link (lines 110-118)
- But if `invitation.sponsor_id` is null, it returns an error (lines 98-107)
- However, if the link creation fails for any other reason, the error might not be properly surfaced to the user

## Fix Applied

1. **Enhanced Error Logging**: Updated `loadSponsor()` in `+layout.svelte` to log detailed error information including:
   - User ID and email
   - Full error details
   - Specific message if no sponsor_admins record is found

2. **Created Diagnostic Scripts**:
   - `scripts/fix-sponsor-admin-links.ts` - Finds and fixes unlinked users
   - `scripts/check-user-sponsor-link.ts` - Checks a specific user's link status

## Next Steps to Fix Existing Users

1. **Run the diagnostic script** to identify which users need links:
   ```bash
   npx tsx scripts/fix-sponsor-admin-links.ts
   ```

2. **For specific users**, check their link status:
   ```bash
   npx tsx scripts/check-user-sponsor-link.ts boots-paul@mailinator.com
   ```

3. **If a user needs a manual link**, use SQL:
   ```sql
   -- Find user
   SELECT id, email FROM profiles WHERE email = 'boots-paul@mailinator.com';
   
   -- Find sponsor (match by email prefix or name)
   SELECT id, name FROM sponsors WHERE name ILIKE '%boots%';
   
   -- Create link
   INSERT INTO sponsor_admins (sponsor_id, user_id)
   VALUES ('<sponsor_id>', '<user_id>')
   ON CONFLICT (sponsor_id, user_id) DO NOTHING;
   ```

## Prevention

1. **Add validation** to ensure sponsor_admin invitations always have sponsor_id
2. **Add better error handling** in the accept flow to surface link creation failures
3. **Add E2E test** for the full invitation flow
4. **Add monitoring** to alert when sponsor links fail to create


