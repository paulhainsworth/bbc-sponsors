/**
 * Server-side API endpoint to post promotion to specific Slack channel
 * Uses Slack Web API (not webhooks) to post to specific channels
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedSecret = env.SLACK_WEBHOOK_SECRET_KEY;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promotionId, channel = 'sponsor-news' } = body;

    if (!promotionId) {
      return json({ success: false, error: 'Missing promotionId' }, { status: 400 });
    }

    // Get Slack Bot Token from environment
    const slackBotToken = env.SLACK_BOT_TOKEN;
    if (!slackBotToken) {
      return json({ success: false, error: 'Slack Bot Token not configured' }, { status: 500 });
    }

    // Use service role key to bypass RLS
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return json(
        { success: false, error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get promotion details
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .select('*, sponsors(name, slug)')
      .eq('id', promotionId)
      .single();

    if (promotionError || !promotion) {
      return json({ success: false, error: 'Promotion not found' }, { status: 404 });
    }

    // Build Slack message
    const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';
    const promotionUrl = `${appUrl}/sponsors/${promotion.sponsors?.slug}/promotions/${promotion.id}`;
    
    let message = `🎉 *New Sponsor Offer from ${promotion.sponsors?.name}!*\n\n`;
    message += `*${promotion.title}*\n\n`;
    
    // Strip HTML from description for Slack
    const plainDescription = promotion.description.replace(/<[^>]*>/g, '').substring(0, 300);
    message += `${plainDescription}${plainDescription.length >= 300 ? '...' : ''}\n\n`;
    
    if (promotion.coupon_code) {
      message += `💰 *Coupon Code:* \`${promotion.coupon_code}\`\n`;
    }
    
    if (promotion.end_date) {
      const endDate = new Date(promotion.end_date);
      message += `📅 *Valid until:* ${endDate.toLocaleDateString()}\n`;
    }
    
    message += `\n👉 <${promotionUrl}|View full details>`;

    // Post to Slack using Web API
    // Option 1: Use chat.postMessage API (requires bot token)
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackBotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel, // Channel ID (C...) or channel name (#sponsor-news)
        text: message,
        unfurl_links: true,
        unfurl_media: true
      })
    });

    const slackResult = await slackResponse.json();

    if (!slackResult.ok) {
      console.error('Slack API error:', slackResult);
      return json({
        success: false,
        error: `Slack API error: ${slackResult.error || 'Unknown error'}`
      }, { status: 500 });
    }

    // Log the notification
    await supabaseAdmin.from('slack_notifications').insert({
      notification_type: 'promotion_approved',
      payload: {
        promotionId,
        channel,
        messageId: slackResult.ts
      },
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return json({
      success: true,
      message: 'Promotion posted to Slack',
      channel,
      messageId: slackResult.ts
    });
  } catch (error) {
    console.error('Post promotion to Slack error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};










