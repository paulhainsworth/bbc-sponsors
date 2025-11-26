/**
 * Server-side API endpoint to toggle promotion status
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
    const { promotionId, newStatus } = body;

    if (!promotionId || !newStatus) {
      return json(
        { success: false, error: 'Promotion ID and new status are required' },
        { status: 400 }
      );
    }

    if (!['draft', 'active', 'expired', 'archived'].includes(newStatus)) {
      return json(
        { success: false, error: 'Invalid status' },
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

    // Update promotion status using admin client (bypasses RLS)
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .update({ status: newStatus })
      .eq('id', promotionId)
      .select()
      .single();

    if (promotionError) {
      console.error('Error updating promotion status:', promotionError);
      return json(
        { success: false, error: `Failed to update promotion status: ${promotionError.message}` },
        { status: 500 }
      );
    }

    return json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Toggle promotion status error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

