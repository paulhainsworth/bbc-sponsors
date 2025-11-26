-- Fix infinite recursion in sponsor_admins RLS policy
-- The issue is that the "Sponsor admins can view team members" policy
-- queries the sponsor_admins table to check permissions, creating a circular dependency
--
-- Solution: Remove the problematic policy entirely
-- Team member viewing will be handled via server-side API endpoints that use service role
-- This avoids RLS recursion issues entirely

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;

-- Note: The following policies remain in effect:
-- 1. "Users can view own sponsor admin records" - allows users to see their own record
-- 2. "Super admins can manage sponsor admins" - allows super admins to see all records
-- 3. "Sponsor admins can remove team members" - allows deleting other team members (uses profiles check, no recursion)
--
-- Team member viewing for sponsor admins will be handled via:
-- /api/sponsor-admin/team-members endpoint (uses service role, bypasses RLS)

