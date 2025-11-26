/**
 * Server-side API endpoint to list promotions for the current sponsor admin
 * This bypasses RLS by using the service role key
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ cookies }) => {
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

    // Fetch promotions using admin client (bypasses RLS)
    const { data: promotions, error: promotionsError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('sponsor_id', sponsorAdmin.sponsor_id)
      .order('created_at', { ascending: false });

    if (promotionsError) {
      console.error('Error fetching promotions:', promotionsError);
      return json(
        { success: false, error: `Failed to fetch promotions: ${promotionsError.message}` },
        { status: 500 }
      );
    }

    return json({
      success: true,
      promotions: promotions || []
    });
  } catch (error) {
    console.error('List promotions error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

