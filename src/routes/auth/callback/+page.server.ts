import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async (event) => {
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, { ...options, path: '/' });
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: '/' });
      }
    }
  });

  const code = event.url.searchParams.get('code');
  const token = event.url.searchParams.get('token');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // If there's an invitation token in the URL, use it
  if (token) {
    throw redirect(303, `/auth/accept-invitation?token=${token}`);
  }

  // If no token in URL, check if user just authenticated and has a pending invitation
  // This handles the case where Supabase's redirect doesn't preserve query params
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.user?.email) {
    // Look up pending invitation by email
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { data: invitation } = await supabaseAdmin
        .from('invitations')
        .select('token, accepted_at, expires_at')
        .eq('email', session.user.email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invitation?.token) {
        // Found a pending invitation, redirect to accept it
        throw redirect(303, `/auth/accept-invitation?token=${invitation.token}`);
      }
    }
  }

  const redirectTo = event.url.searchParams.get('redirect') || '/';
  throw redirect(303, redirectTo);
};

