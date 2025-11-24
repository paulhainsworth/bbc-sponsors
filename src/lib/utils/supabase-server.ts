import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createServerClient(cookies: Cookies) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => cookies.get(key),
      set: (key, value, options) => {
        cookies.set(key, value, { ...options, path: '/' });
      },
      remove: (key, options) => {
        cookies.delete(key, { ...options, path: '/' });
      }
    }
  });
}

