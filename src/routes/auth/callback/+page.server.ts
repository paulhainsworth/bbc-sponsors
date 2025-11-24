import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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

  // If there's an invitation token, redirect to accept invitation page
  if (token) {
    throw redirect(303, `/auth/accept-invitation?token=${token}`);
  }

  const redirectTo = event.url.searchParams.get('redirect') || '/';
  throw redirect(303, redirectTo);
};

