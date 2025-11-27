-- Run this SQL in Supabase SQL Editor to check all policies on sponsor_admins

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'sponsor_admins'
ORDER BY policyname;

-- If the problematic policy exists, drop it:
-- DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;


