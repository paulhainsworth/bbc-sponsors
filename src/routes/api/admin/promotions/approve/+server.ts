/**
 * Server-side API endpoint to approve/reject promotions
 * Super admins can approve: publish to site, publish to Slack, feature on homepage
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Get the authenticated user's session
    const supabaseClient = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get: (key) => cookies.get(key),
        set: () => {},
        remove: () => {}
      }
    });

    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a super admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return json({ success: false, error: 'Unauthorized - super admin only' }, { status: 403 });
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

    const body = await request.json();
    const {
      promotionId,
      action, // 'approve' or 'reject'
      publishToSite = false,
      publishToSlack = false,
      isFeatured = false,
      slackChannel = null, // Channel ID or name
      approvalNotes = null
    } = body;

    if (!promotionId || !action) {
      return json({ success: false, error: 'Missing promotionId or action' }, { status: 400 });
    }

    // Get promotion details
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .select('*, sponsors(name, slug)')
      .eq('id', promotionId)
      .single();

    if (promotionError || !promotion) {
      return json({ success: false, error: 'Promotion not found' }, { status: 404 });
    }

    if (action === 'reject') {
      // Reject the promotion
      const { error: updateError } = await supabaseAdmin
        .from('promotions')
        .update({
          approval_status: 'rejected',
          approved_by: session.user.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes
        })
        .eq('id', promotionId);

      if (updateError) {
        return json({ success: false, error: updateError.message }, { status: 500 });
      }

      return json({
        success: true,
        message: 'Promotion rejected'
      });
    }

    // Approve the promotion
    const updateData: any = {
      approval_status: 'approved',
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes,
      publish_to_site: publishToSite,
      publish_to_slack: publishToSlack,
      is_featured: isFeatured
    };

    // If approved to publish to site, set status to active
    if (publishToSite) {
      updateData.status = 'active';
    }

    // If Slack channel specified, store it
    if (publishToSlack && slackChannel) {
      updateData.slack_channel = slackChannel;
    }

    const { error: updateError } = await supabaseAdmin
      .from('promotions')
      .update(updateData)
      .eq('id', promotionId);

    if (updateError) {
      return json({ success: false, error: updateError.message }, { status: 500 });
    }

    // If approved to publish to Slack, send notification
    if (publishToSlack) {
      try {
        await fetch(`${env.PUBLIC_APP_URL || 'http://localhost:5173'}/api/slack/post-promotion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.SLACK_WEBHOOK_SECRET_KEY || ''}`
          },
          body: JSON.stringify({
            promotionId,
            channel: slackChannel || 'sponsor-news'
          })
        });
      } catch (slackError) {
        console.error('Error posting to Slack:', slackError);
        // Don't fail the approval if Slack fails
      }
    }

    return json({
      success: true,
      message: 'Promotion approved',
      promotion: {
        ...promotion,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Approve promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

