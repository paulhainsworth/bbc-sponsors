# Promotions INSERT RLS Policy Fix

## Problem

When creating a promotion, the error "new row violates row-level security policy for table 'promotions'" occurs.

## Root Cause

The RLS policy "Sponsor admins can manage their promotions" only has a `USING` clause:
- `USING` applies to SELECT, UPDATE, DELETE (checking existing rows)
- `WITH CHECK` is needed for INSERT, UPDATE (checking new/modified rows)

When inserting a new promotion, PostgreSQL needs the `WITH CHECK` clause to validate that the user is allowed to insert a promotion with the given `sponsor_id`.

## Solution

Run this SQL in Supabase SQL Editor (Production):

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS "Sponsor admins can manage their promotions" ON promotions;

-- Re-create with separate USING and WITH CHECK clauses
CREATE POLICY "Sponsor admins can manage their promotions" ON promotions
  USING (
    -- For SELECT, UPDATE, DELETE: check if user is admin for this promotion's sponsor
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = promotions.sponsor_id 
      AND sponsor_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- For INSERT, UPDATE: check if user is admin for the sponsor_id being set
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = promotions.sponsor_id 
      AND sponsor_admins.user_id = auth.uid()
    )
  );
```

## Why This Works

- `USING`: Validates existing rows (for SELECT, UPDATE, DELETE)
- `WITH CHECK`: Validates new/modified rows (for INSERT, UPDATE)
- Both check that the user has a `sponsor_admins` record linking them to the promotion's `sponsor_id`

## After Applying

1. Refresh the browser
2. Try creating a promotion again
3. Should work without RLS errors

