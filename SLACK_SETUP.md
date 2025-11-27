# Slack Integration Setup Guide

This guide explains how to set up Slack integration for the promotion approval workflow.

## Overview

The system supports posting approved promotions to a specific Slack channel (#sponsor-news) using the Slack Web API. This requires a Slack Bot Token with appropriate permissions.

## What You Need from Slack

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "BBC Sponsor Bot")
4. Select your workspace

### 2. Configure Bot Token Scopes

1. In your app settings, go to "OAuth & Permissions"
2. Under "Bot Token Scopes", add the following scopes:
   - `chat:write` - Post messages to channels
   - `channels:read` - View basic information about public channels (optional, for channel lookup)
   - `channels:join` - Join public channels (if bot needs to join)

### 3. Install App to Workspace

1. In "OAuth & Permissions", scroll to "Install App to Workspace"
2. Click "Install to Workspace"
3. Review and authorize the permissions
4. **Copy the "Bot User OAuth Token"** - This starts with `xoxb-` and is what you need

### 4. Get Channel ID

You have two options:

**Option A: Use Channel Name (Easier)**
- Just use the channel name: `sponsor-news`
- The bot must be a member of the channel

**Option B: Use Channel ID (More Reliable)**
1. In Slack, right-click on the #sponsor-news channel
2. Click "View channel details"
3. Scroll down to find the Channel ID (starts with `C`)
4. Or use the Slack API to get it programmatically

### 5. Invite Bot to Channel

1. In the #sponsor-news channel, type: `/invite @YourBotName`
2. Or add the bot manually through channel settings

## Environment Variables

Add these to your `.env` file:

```bash
# Slack Bot Token (from step 3 above)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Slack Webhook Secret (for API authentication - can be any random string)
SLACK_WEBHOOK_SECRET_KEY=your-secret-key-here

# Public App URL (for email notifications)
PUBLIC_APP_URL=https://your-domain.com
```

## Testing the Integration

1. Create a test promotion as a sponsor admin
2. Log in as super admin
3. Go to `/admin/promotions`
4. Click "Review & Approve" on a pending promotion
5. Check "Publish to Slack"
6. Enter channel name: `sponsor-news` (or channel ID)
7. Click "Approve Promotion"
8. Check the #sponsor-news channel for the message

## Troubleshooting

### Bot not posting messages
- Verify the bot is a member of the channel
- Check that the bot token has `chat:write` scope
- Verify the channel name/ID is correct
- Check server logs for Slack API errors

### "channel_not_found" error
- Make sure the bot is invited to the channel
- Verify the channel name or ID is correct
- Try using the channel ID instead of name

### "not_in_channel" error
- The bot must be a member of the channel
- Invite the bot using `/invite @YourBotName` in the channel

## Alternative: Using Incoming Webhooks

If you prefer to use Incoming Webhooks instead of the Web API:

1. In your Slack app, go to "Incoming Webhooks"
2. Activate Incoming Webhooks
3. Add New Webhook to Workspace
4. Select the #sponsor-news channel
5. Copy the webhook URL
6. Update the code to use webhooks instead of Web API

Note: Webhooks are simpler but less flexible (can't specify channel dynamically).

## Email Notifications

Currently, email notifications are logged to the console. To enable actual email sending:

1. Choose an email service (SendGrid, Resend, AWS SES, etc.)
2. Update `/api/admin/notify-promotion-pending/+server.ts` to send emails
3. Add email service API key to environment variables

Example with Resend:
```typescript
import { Resend } from 'resend';
const resend = new Resend(env.RESEND_API_KEY);

await resend.emails.send({
  from: 'notifications@yourdomain.com',
  to: admin.email,
  subject: 'New Promotion Pending Approval',
  html: `...`
});
```

