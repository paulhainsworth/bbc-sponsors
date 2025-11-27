# Promotion Approval Workflow

## Overview

This document describes the promotion approval workflow that allows sponsor admins to create promotions that require super admin approval before being published.

## Workflow Steps

1. **Sponsor Admin Creates Promotion**
   - Sponsor admin creates a new promotion via `/sponsor-admin/promotions/new`
   - Promotion is automatically set to `status: 'pending_approval'` and `approval_status: 'pending'`
   - Email notification is sent to all super admins (currently logged to console)

2. **Super Admin Receives Notification**
   - Super admin receives email notification about pending promotion
   - Email includes link to approval page: `/admin/promotions/{id}/approve`

3. **Super Admin Reviews & Approves**
   - Super admin logs into site and navigates to `/admin/promotions`
   - Views pending promotions list
   - Clicks "Review & Approve" on a promotion
   - Can choose:
     - ✅ **Publish to Site** - Makes promotion visible on public website
     - ✅ **Publish to Slack** - Posts promotion to #sponsor-news Slack channel
     - ✅ **Feature on Homepage** - Displays in featured carousel
   - Can add approval notes
   - Clicks "Approve Promotion" or "Reject"

4. **Promotion Goes Live**
   - If "Publish to Site" is checked, promotion status changes to `active`
   - If "Publish to Slack" is checked, message is posted to specified channel
   - If "Feature on Homepage" is checked, `is_featured` is set to `true`

## Database Changes

### New Fields Added to `promotions` Table

- `approval_status` - 'pending', 'approved', or 'rejected'
- `approved_by` - UUID of super admin who approved/rejected
- `approved_at` - Timestamp of approval/rejection
- `approval_notes` - Optional notes from super admin
- `publish_to_site` - Boolean, whether to publish to public site
- `publish_to_slack` - Boolean, whether to post to Slack
- `slack_channel` - Channel ID or name for Slack posting

### Status Values

- `status`: 'draft', 'pending_approval', 'active', 'expired', 'archived'
- `approval_status`: 'pending', 'approved', 'rejected'

## API Endpoints

### POST `/api/admin/notify-promotion-pending`
- Notifies super admins of new pending promotion
- Currently logs to console (email integration needed)

### POST `/api/admin/promotions/approve`
- Approves or rejects a promotion
- Handles publishing to site, Slack, and featuring

### POST `/api/slack/post-promotion`
- Posts approved promotion to Slack channel
- Uses Slack Web API with bot token

## Pages

### `/admin/promotions`
- Lists all promotions with filter for pending approvals
- Shows approval status badges
- Links to approval page

### `/admin/promotions/[id]/approve`
- Detailed promotion review page
- Approval options checkboxes
- Approve/Reject buttons

## What You Need to Complete

### 1. Run Database Migration
```bash
# Apply the migration to add approval fields
# Run in Supabase SQL Editor or via CLI
supabase/migrations/009_promotion_approval_workflow.sql
```

### 2. Set Up Slack Integration
See `SLACK_SETUP.md` for detailed instructions. You need:
- Slack Bot Token (xoxb-...)
- Bot added to #sponsor-news channel
- Environment variable: `SLACK_BOT_TOKEN`

### 3. Set Up Email Notifications
Currently, email notifications are logged to console. To enable actual emails:

1. Choose email service (SendGrid, Resend, AWS SES, etc.)
2. Update `/api/admin/notify-promotion-pending/+server.ts`
3. Add email service API key to environment variables

### 4. Environment Variables Required

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_WEBHOOK_SECRET_KEY=your-secret-key-here

# App
PUBLIC_APP_URL=https://your-domain.com

# Email (when implemented)
# RESEND_API_KEY=re_... (or your email service key)
```

## Testing the Workflow

1. **As Sponsor Admin:**
   - Create a new promotion
   - Should see message: "Promotion created and submitted for approval"
   - Promotion should appear in your list with "pending" status

2. **As Super Admin:**
   - Check console logs for email notification (or check email if configured)
   - Go to `/admin/promotions`
   - See pending promotion in list
   - Click "Review & Approve"
   - Select approval options
   - Click "Approve Promotion"
   - Verify promotion appears on public site (if publish_to_site checked)
   - Verify message appears in Slack (if publish_to_slack checked)

## Future Enhancements

- Email notifications with actual email service
- Rejection notifications to sponsor admins
- Bulk approval actions
- Approval history/audit log
- Email templates customization

