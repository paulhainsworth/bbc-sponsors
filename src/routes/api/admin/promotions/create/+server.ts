/**
 * Server-side API endpoint to create a promotion as a super admin
 * This allows super admins to create promotions for any sponsor
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

    // Verify user is a super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return json(
        { success: false, error: 'Unauthorized: Only super admins can create promotions' },
        { status: 403 }
      );
    }

    // Get promotion data from request
    const body = await request.json();
    const {
      sponsor_id,
      title,
      description,
      promotion_type,
      start_date,
      end_date,
      coupon_code,
      external_link,
      terms,
      is_featured = false,
      status = 'active', // Super admins can create active promotions directly
      publish_to_site = true,
      publish_to_slack = false,
      slack_channel = null
    } = body;

    // Validate required fields
    if (!sponsor_id || !title || !description || !promotion_type) {
      return json(
        { success: false, error: 'Sponsor ID, title, description, and promotion type are required' },
        { status: 400 }
      );
    }

    // Verify sponsor exists
    const { data: sponsor, error: sponsorError } = await supabaseAdmin
      .from('sponsors')
      .select('id')
      .eq('id', sponsor_id)
      .single();

    if (sponsorError || !sponsor) {
      return json(
        { success: false, error: 'Sponsor not found' },
        { status: 404 }
      );
    }

    // Create promotion - super admins can set all fields including is_featured
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .insert({
        sponsor_id,
        title,
        description,
        promotion_type,
        start_date,
        end_date: end_date || null,
        coupon_code: coupon_code || null,
        external_link: external_link || null,
        terms: terms || null,
        is_featured: is_featured || false,
        status: status === 'active' ? 'active' : 'draft',
        approval_status: status === 'active' ? 'approved' : 'pending',
        approved_by: status === 'active' ? session.user.id : null,
        approved_at: status === 'active' ? new Date().toISOString() : null,
        publish_to_site: publish_to_site || false,
        publish_to_slack: publish_to_slack || false,
        slack_channel: slack_channel || null,
        created_by: session.user.id
      })
      .select()
      .single();

    if (promotionError) {
      console.error('Error creating promotion:', promotionError);
      
      // Provide helpful error message if approval_status column is missing
      if (promotionError.message?.includes('approval_status')) {
        return json(
          { 
            success: false, 
            error: `Database migration required: The approval_status column is missing. Please run the migration file '009_promotion_approval_workflow.sql' in your Supabase SQL Editor, or run the quick fix script '009_promotion_approval_workflow_quick_fix.sql'.` 
          },
          { status: 500 }
        );
      }
      
      return json(
        { success: false, error: `Failed to create promotion: ${promotionError.message}` },
        { status: 500 }
      );
    }

    // If approved and publishToSlack is true, send to Slack
    if (status === 'active' && publish_to_slack && promotion) {
      try {
        const { data: promotionWithSponsor } = await supabaseAdmin
          .from('promotions')
          .select('*, sponsors(name, slug)')
          .eq('id', promotion.id)
          .single();

        if (promotionWithSponsor) {
          await fetch(`${env.PUBLIC_APP_URL || 'http://localhost:5173'}/api/slack/post-promotion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.SLACK_WEBHOOK_SECRET_KEY || ''}`
            },
            body: JSON.stringify({
              promotion: promotionWithSponsor,
              channel: slack_channel
            })
          });
        }
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError);
        // Don't fail the promotion creation if Slack notification fails
      }
    }

    return json({
      success: true,
      promotion,
      message: status === 'active' 
        ? 'Promotion created and published successfully.' 
        : 'Promotion created successfully.'
    });
  } catch (error) {
    console.error('Create promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

