/**
 * Server-side API endpoint to get team members for the current sponsor admin
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

    // Get sponsor link for the authenticated user
    const { data: sponsorAdmin, error: linkError } = await supabaseAdmin
      .from('sponsor_admins')
      .select('sponsor_id')
      .eq('user_id', session.user.id)
      .single();

    if (linkError || !sponsorAdmin) {
      return json(
        { success: false, error: 'No sponsor associated with your account' },
        { status: 404 }
      );
    }

    // Get all team members for this sponsor
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('sponsor_admins')
      .select(`
        id,
        user_id,
        created_at,
        profiles:user_id (
          id,
          email,
          display_name,
          role
        )
      `)
      .eq('sponsor_id', sponsorAdmin.sponsor_id)
      .order('created_at', { ascending: false });

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      return json(
        { success: false, error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return json({
      success: true,
      teamMembers: teamMembers || []
    });
  } catch (error) {
    console.error('Get team members error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};


