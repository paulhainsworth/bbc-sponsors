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
  const redirectTo = event.url.searchParams.get('redirect') || '/';

  // Handle PKCE flow (code in query params)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Successfully exchanged code, now check for invitation
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email) {
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
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
            throw redirect(303, `/auth/accept-invitation?token=${invitation.token}`);
          }
        }
      }
      
      // Redirect to home or specified destination
      throw redirect(303, redirectTo);
    }
  }

  // If there's an invitation token in the URL, redirect to accept it
  if (token) {
    throw redirect(303, `/auth/accept-invitation?token=${token}`);
  }

  // No code parameter - this might be an implicit flow with hash fragments
  // Don't redirect here - let the client-side handle it
  // The +page.svelte will check for hash fragment tokens
  
  // But first, check if there's already a session (user might be refreshing)
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Already authenticated, redirect to destination
    throw redirect(303, redirectTo);
  }
  
  // No session and no code - let client-side handle potential hash fragments
  return { redirectTo };
};

