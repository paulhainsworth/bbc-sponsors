# RLS Policy Fix for Sponsor Admins

## Problem

The RLS policy "Sponsor admins can view team members" from migration 005 creates a circular dependency:

```sql
CREATE POLICY "Sponsor admins can view team members" ON sponsor_admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins sa1
      WHERE sa1.sponsor_id = sponsor_admins.sponsor_id
      AND sa1.user_id = auth.uid()
    )
  );
```

This policy requires that you **already have a record** in `sponsor_admins` to view ANY record, including your own. This creates a chicken-and-egg problem.

## Solution

The migration `006_fix_sponsor_admin_rls_policy.sql` fixes this by:

1. Dropping the conflicting policy
2. Re-creating it with a condition that allows viewing your own record OR other team members

The new policy:
- Allows viewing your own record (handled by the original "Users can view own sponsor admin records" policy)
- OR allows viewing other team members' records for the same sponsor

## How to Apply

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop the conflicting policy
DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;

-- Re-create it with a better condition
CREATE POLICY "Sponsor admins can view team members" ON sponsor_admins
  FOR SELECT USING (
    -- Allow if you're viewing your own record (handled by original policy)
    auth.uid() = user_id
    OR
    -- OR if you're viewing another team member's record for the same sponsor
    (
      EXISTS (
        SELECT 1 FROM sponsor_admins sa1
        WHERE sa1.sponsor_id = sponsor_admins.sponsor_id
        AND sa1.user_id = auth.uid()
        AND sa1.user_id != sponsor_admins.user_id  -- Not yourself
      )
    )
  );
```

## Why This Works

PostgreSQL RLS policies are combined with OR logic. The new policy explicitly allows `auth.uid() = user_id`, which means you can always view your own record. The EXISTS clause only applies when viewing OTHER users' records.

This eliminates the circular dependency while still allowing sponsor admins to view their team members.

