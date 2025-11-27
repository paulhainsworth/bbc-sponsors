/**
 * Server-side API endpoint to create a promotion
 * This bypasses RLS by using the service role key
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

    // Verify user is a sponsor admin and get their sponsor_id
    const { data: sponsorAdmin, error: linkError } = await supabaseAdmin
      .from('sponsor_admins')
      .select('sponsor_id')
      .eq('user_id', session.user.id)
      .single();

    if (linkError || !sponsorAdmin) {
      return json(
        { success: false, error: 'No sponsor associated with your account' },
        { status: 403 }
      );
    }

    // Get promotion data from request
    const body = await request.json();
    const {
      title,
      description,
      promotion_type,
      start_date,
      end_date,
      coupon_code,
      external_link,
      terms,
      is_featured,
      status = 'active' // Default to 'active' so promotions show immediately
    } = body;

    // Validate required fields
    if (!title || !description || !promotion_type) {
      return json(
        { success: false, error: 'Title, description, and promotion type are required' },
        { status: 400 }
      );
    }

    // Sponsor admins cannot feature promotions - only super admins can
    // Always set is_featured to false for sponsor admin-created promotions
    const isFeatured = false;

    // Create promotion with pending_approval status (requires super admin approval)
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .insert({
        sponsor_id: sponsorAdmin.sponsor_id,
        title,
        description,
        promotion_type,
        start_date,
        end_date: end_date || null,
        coupon_code: coupon_code || null,
        external_link: external_link || null,
        terms: terms || null,
        is_featured: isFeatured, // Always false for sponsor admins
        status: 'pending_approval', // Requires super admin approval
        approval_status: 'pending',
        created_by: session.user.id
      })
      .select()
      .single();

    if (promotionError) {
      console.error('Error creating promotion:', promotionError);
      return json(
        { success: false, error: `Failed to create promotion: ${promotionError.message}` },
        { status: 500 }
      );
    }

    // Send email notification to super admins (async, don't wait)
    // Use the request URL to determine the base URL
    const baseUrl = request.headers.get('origin') || env.PUBLIC_APP_URL || 'http://localhost:5173';
    fetch(`${baseUrl}/api/admin/notify-promotion-pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SLACK_WEBHOOK_SECRET_KEY || ''}`
      },
      body: JSON.stringify({
        promotionId: promotion.id,
        sponsorId: sponsorAdmin.sponsor_id
      })
    }).catch((emailError) => {
      console.error('Error sending email notification:', emailError);
      // Don't fail the promotion creation if email fails
    });

    return json({
      success: true,
      promotion,
      message: 'Promotion created and submitted for approval. You will be notified once it is reviewed.'
    });
  } catch (error) {
    console.error('Create promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

