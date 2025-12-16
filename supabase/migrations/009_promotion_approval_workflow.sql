-- Migration: Add promotion approval workflow
-- This adds pending_approval status and approval tracking fields

-- Update promotions table to add approval fields
ALTER TABLE promotions 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS publish_to_site BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS publish_to_slack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slack_channel TEXT; -- Channel ID or name for Slack posting

-- Update status enum to include 'pending_approval'
ALTER TABLE promotions 
  DROP CONSTRAINT IF EXISTS promotions_status_check;

ALTER TABLE promotions 
  ADD CONSTRAINT promotions_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'active', 'expired', 'archived'));

-- Create index for pending approvals
CREATE INDEX IF NOT EXISTS idx_promotions_approval_status 
  ON promotions(approval_status) 
  WHERE approval_status = 'pending';

-- Create index for approved promotions that need publishing
CREATE INDEX IF NOT EXISTS idx_promotions_pending_publish 
  ON promotions(approval_status, publish_to_site, publish_to_slack) 
  WHERE approval_status = 'approved' AND (publish_to_site = FALSE OR publish_to_slack = FALSE);

-- Add comment for documentation
COMMENT ON COLUMN promotions.approval_status IS 'Approval workflow status: pending, approved, or rejected';
COMMENT ON COLUMN promotions.publish_to_site IS 'Whether super admin approved publishing to the public site';
COMMENT ON COLUMN promotions.publish_to_slack IS 'Whether super admin approved publishing to Slack #sponsor-news channel';
COMMENT ON COLUMN promotions.slack_channel IS 'Slack channel ID or name where promotion should be posted';










