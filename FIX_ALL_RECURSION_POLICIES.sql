-- Fix all infinite recursion policies on sponsor_admins
-- Run this in Supabase SQL Editor (Production)

-- First, check what policies exist
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'sponsor_admins'
ORDER BY policyname;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;

-- Verify it's gone
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'sponsor_admins'
ORDER BY policyname;

-- Expected policies after fix:
-- 1. "Users can view own sponsor admin records" (SELECT, auth.uid() = user_id)
-- 2. "Users can insert own sponsor admin record" (INSERT, auth.uid() = user_id)
-- 3. "Super admins can manage sponsor admins" (ALL, checks profiles table)
-- 4. "Sponsor admins can remove team members" (DELETE, checks profiles table)

