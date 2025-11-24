import { createServerClient } from '@supabase/ssr';
import type { PageServerLoad } from './$types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
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
  const { slug } = params;

  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!sponsor) {
    return {
      sponsor: null
    };
  }

  return {
    sponsor
  };
};

