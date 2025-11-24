-- Script to create a super admin profile
-- 
-- INSTRUCTIONS:
-- 1. Sign up via the app at /auth/login with your email
-- 2. Go to Supabase Dashboard > Authentication > Users
-- 3. Find your user and copy their UUID
-- 4. Replace 'YOUR_USER_UUID_HERE' below with that UUID
-- 5. Replace 'your-email@example.com' with your email
-- 6. Replace 'Your Name' with your display name
-- 7. Run this SQL in Supabase SQL Editor

INSERT INTO profiles (id, email, role, display_name)
VALUES (
  'YOUR_USER_UUID_HERE',  -- Replace with your user UUID from Supabase Auth
  'your-email@example.com',  -- Replace with your email
  'super_admin',
  'Your Name'  -- Replace with your display name
)
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin',
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

