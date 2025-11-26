/**
 * Server-side API endpoint to get sponsor ID for the current user
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

    if (sessionError) {
      console.error('Session error in get-sponsor API:', sessionError);
      return json({ success: false, error: `Session error: ${sessionError.message}` }, { status: 401 });
    }

    if (!session) {
      console.error('No session found in get-sponsor API');
      console.error('Available cookies:', Object.keys(cookies.getAll()));
      return json({ success: false, error: 'Not authenticated - no session found' }, { status: 401 });
    }

    console.log('Session found in get-sponsor API:', {
      userId: session.user.id,
      email: session.user.email
    });

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
    console.log('Querying sponsor_admins for user:', session.user.id);
    const { data: sponsorAdmin, error: linkError } = await supabaseAdmin
      .from('sponsor_admins')
      .select('sponsor_id, sponsors(name, slug)')
      .eq('user_id', session.user.id)
      .single();

    if (linkError) {
      console.error('Error querying sponsor_admins:', linkError);
      console.error('Error code:', linkError.code);
      console.error('Error message:', linkError.message);
      return json(
        { success: false, error: `Database error: ${linkError.message}` },
        { status: 500 }
      );
    }

    if (!sponsorAdmin) {
      console.error('No sponsor_admin record found for user:', session.user.id);
      // Double-check by querying all records for this user
      const { data: allRecords } = await supabaseAdmin
        .from('sponsor_admins')
        .select('*')
        .eq('user_id', session.user.id);
      console.error('All sponsor_admin records for user:', allRecords);
      return json(
        { success: false, error: 'No sponsor associated with your account' },
        { status: 404 }
      );
    }

    console.log('Sponsor found:', {
      sponsorId: sponsorAdmin.sponsor_id,
      sponsorName: sponsorAdmin.sponsors?.name
    });

    return json({
      success: true,
      sponsorId: sponsorAdmin.sponsor_id,
      sponsorName: sponsorAdmin.sponsors?.name,
      sponsorSlug: sponsorAdmin.sponsors?.slug
    });
  } catch (error) {
    console.error('Get sponsor error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

