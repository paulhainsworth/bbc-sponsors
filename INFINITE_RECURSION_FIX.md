# Infinite Recursion RLS Policy Fix

## Problem

When creating a new sponsor, the error "infinite recursion detected in policy for relation 'sponsor_admins'" occurs.

## Root Cause

The RLS policy "Sponsor admins can view team members" from migration 006 creates infinite recursion:

```sql
CREATE POLICY "Sponsor admins can view team members" ON sponsor_admins
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM sponsor_admins sa1
      WHERE sa1.sponsor_id = sponsor_admins.sponsor_id
      AND sa1.user_id = auth.uid()
    )
  );
```

When PostgreSQL evaluates this policy:
1. It needs to check if `sa1` exists in `sponsor_admins`
2. To check if `sa1` exists, it needs to evaluate the RLS policy on `sponsor_admins`
3. This creates infinite recursion

## Solution

### 1. Remove the Problematic Policy

Migration `007_fix_infinite_recursion.sql` drops the problematic policy:

```sql
DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;
```

### 2. Use Server-Side API Endpoints

Instead of relying on RLS for team member viewing, we use server-side API endpoints that bypass RLS:

- `/api/sponsor-admin/get-sponsor` - Gets sponsor ID for current user
- `/api/sponsor-admin/team-members` - Gets all team members for the sponsor

These endpoints use the service role key, which bypasses RLS entirely.

### 3. Updated Team Page

The team page (`src/routes/sponsor-admin/team/+page.svelte`) now uses the API endpoint instead of querying directly.

## Remaining Policies

The following policies remain in effect (no recursion issues):

1. **"Users can view own sponsor admin records"** - `auth.uid() = user_id` (simple, no recursion)
2. **"Super admins can manage sponsor admins"** - Checks `profiles` table (no recursion)
3. **"Sponsor admins can remove team members"** - Checks `profiles` table (no recursion)

## How to Apply

Run this SQL in Supabase SQL Editor:

```sql
DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;
```

Or apply the migration file: `supabase/migrations/007_fix_infinite_recursion.sql`

## Testing

1. Log in as admin
2. Create a new sponsor
3. Should work without infinite recursion error
4. Team member viewing should work via the API endpoint


