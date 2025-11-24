import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const POST: RequestHandler = async ({ request, cookies }) => {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
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

    // Call the database function to expire promotions
    const { error } = await supabase.rpc('expire_promotions');

    if (error) {
      console.error('Error expiring promotions:', error);
      return json({ success: false, error: error.message }, { status: 500 });
    }

    return json({ success: true, message: 'Promotions expired successfully' });
  } catch (error) {
    console.error('Cron error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

