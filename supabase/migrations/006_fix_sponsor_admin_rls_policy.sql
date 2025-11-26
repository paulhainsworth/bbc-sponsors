-- Fix RLS policy conflict for sponsor_admins
-- The "Sponsor admins can view team members" policy requires an existing sponsor_admins record
-- which creates a chicken-and-egg problem when querying your own record
-- 
-- Solution: Drop the conflicting policy and ensure the original policy works correctly
-- The original "Users can view own sponsor admin records" policy should be sufficient

-- Drop the conflicting policy that requires an existing record
DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;

-- Re-create it with a better condition that doesn't create a circular dependency
-- This policy allows sponsor admins to view OTHER team members (not themselves)
-- The original policy handles viewing your own record
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

