-- Quick fix: Add approval_status column if migration hasn't been run
-- Run this in Supabase SQL Editor if you're getting the "approval_status column not found" error

-- Add approval_status column if it doesn't exist
ALTER TABLE promotions 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add other approval workflow columns if they don't exist
ALTER TABLE promotions 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS publish_to_site BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS publish_to_slack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slack_channel TEXT;

-- Update status constraint to include 'pending_approval'
ALTER TABLE promotions 
  DROP CONSTRAINT IF EXISTS promotions_status_check;

ALTER TABLE promotions 
  ADD CONSTRAINT promotions_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'active', 'expired', 'archived'));









