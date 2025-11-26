/**
 * Server-side API endpoint to update a promotion
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
      promotionId,
      title,
      description,
      promotion_type,
      start_date,
      end_date,
      coupon_code,
      external_link,
      terms,
      is_featured
    } = body;

    if (!promotionId) {
      return json(
        { success: false, error: 'Promotion ID is required' },
        { status: 400 }
      );
    }

    // Verify the promotion belongs to the user's sponsor
    const { data: existingPromotion, error: fetchError } = await supabaseAdmin
      .from('promotions')
      .select('sponsor_id')
      .eq('id', promotionId)
      .single();

    if (fetchError || !existingPromotion) {
      return json(
        { success: false, error: 'Promotion not found' },
        { status: 404 }
      );
    }

    if (existingPromotion.sponsor_id !== sponsorAdmin.sponsor_id) {
      return json(
        { success: false, error: 'You do not have permission to update this promotion' },
        { status: 403 }
      );
    }

    // Sponsor admins cannot change is_featured - only super admins can
    // Get current is_featured value to preserve it
    const { data: currentPromotion } = await supabaseAdmin
      .from('promotions')
      .select('is_featured')
      .eq('id', promotionId)
      .single();

    const currentIsFeatured = currentPromotion?.is_featured || false;

    // Update promotion using admin client (bypasses RLS)
    // Note: is_featured is preserved from current value - sponsor admins cannot change it
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .update({
        title,
        description,
        promotion_type,
        start_date,
        end_date: end_date || null,
        coupon_code: coupon_code || null,
        external_link: external_link || null,
        terms: terms || null,
        is_featured: currentIsFeatured // Preserve existing value - sponsor admins cannot change this
      })
      .eq('id', promotionId)
      .select()
      .single();

    if (promotionError) {
      console.error('Error updating promotion:', promotionError);
      return json(
        { success: false, error: `Failed to update promotion: ${promotionError.message}` },
        { status: 500 }
      );
    }

    return json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Update promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

