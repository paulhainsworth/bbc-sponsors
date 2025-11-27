-- Fix promotions INSERT policy for sponsor admins
-- The current policy uses USING which doesn't work for INSERT operations
-- INSERT operations need WITH CHECK clause

-- Drop the existing policy
DROP POLICY IF EXISTS "Sponsor admins can manage their promotions" ON promotions;

-- Re-create with separate USING and WITH CHECK clauses
-- USING: for SELECT, UPDATE, DELETE (checking existing rows)
-- WITH CHECK: for INSERT, UPDATE (checking new/modified rows)
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


