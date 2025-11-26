/**
 * Server-side API endpoint to delete a promotion
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

    // Get promotion ID from request
    const body = await request.json();
    const { promotionId } = body;

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
        { success: false, error: 'You do not have permission to delete this promotion' },
        { status: 403 }
      );
    }

    // Delete promotion using admin client (bypasses RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('promotions')
      .delete()
      .eq('id', promotionId);

    if (deleteError) {
      console.error('Error deleting promotion:', deleteError);
      return json(
        { success: false, error: `Failed to delete promotion: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return json({
      success: true
    });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

