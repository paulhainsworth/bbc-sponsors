/**
 * Server-side API endpoint for super admin to manage sponsor promotions
 * Supports: GET (list), POST (create), PUT (update), DELETE
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

async function verifySuperAdmin(cookies: any) {
  const supabaseClient = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key: string) => cookies.get(key),
      set: () => {},
      remove: () => {}
    }
  });

  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    return { error: 'Not authenticated', status: 401 };
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: 'Service role key not configured', status: 500 };
  }

  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'super_admin') {
    return { error: 'Only super admins can manage sponsor promotions', status: 403 };
  }

  return { session, supabaseAdmin };
}

// GET: List promotions for a sponsor
export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    const auth = await verifySuperAdmin(cookies);
    if ('error' in auth) {
      return json({ success: false, error: auth.error }, { status: auth.status });
    }

    const sponsorId = url.searchParams.get('sponsorId');
    if (!sponsorId) {
      return json({ success: false, error: 'Sponsor ID is required' }, { status: 400 });
    }

    const { data: promotions, error } = await auth.supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .order('created_at', { ascending: false });

    if (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }

    return json({ success: true, promotions });
  } catch (error) {
    console.error('List promotions error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

// POST: Create promotion for a sponsor
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const auth = await verifySuperAdmin(cookies);
    if ('error' in auth) {
      return json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      sponsorId,
      title,
      description,
      promotion_type,
      start_date,
      end_date,
      coupon_code,
      external_link,
      terms,
      is_featured,
      status = 'active',
      image_url
    } = body;

    if (!sponsorId) {
      return json({ success: false, error: 'Sponsor ID is required' }, { status: 400 });
    }

    if (!title || !description || !promotion_type) {
      return json(
        { success: false, error: 'Title, description, and promotion type are required' },
        { status: 400 }
      );
    }

    // Verify sponsor exists
    const { data: sponsor, error: sponsorError } = await auth.supabaseAdmin
      .from('sponsors')
      .select('id')
      .eq('id', sponsorId)
      .single();

    if (sponsorError || !sponsor) {
      return json({ success: false, error: 'Sponsor not found' }, { status: 404 });
    }

    // Create promotion - super admin can set is_featured and skip approval
    const { data: promotion, error: promotionError } = await auth.supabaseAdmin
      .from('promotions')
      .insert({
        sponsor_id: sponsorId,
        title,
        description,
        promotion_type,
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        coupon_code: coupon_code || null,
        external_link: external_link || null,
        terms: terms || null,
        is_featured: is_featured || false,
        status: status,
        approval_status: 'approved', // Super admin created, auto-approved
        image_url: image_url || null,
        created_by: auth.session.user.id
      })
      .select()
      .single();

    if (promotionError) {
      console.error('Error creating promotion:', promotionError);
      return json(
        { success: false, error: `Failed to create promotion: ${promotionError.message}` },
        { status: 500 }
      );
    }

    return json({ success: true, promotion });
  } catch (error) {
    console.error('Create promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

// PUT: Update promotion
export const PUT: RequestHandler = async ({ request, cookies }) => {
  try {
    const auth = await verifySuperAdmin(cookies);
    if ('error' in auth) {
      return json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      promotionId,
      title,
      description,
      promotion_type,
      start_date,
      end_date,
      coupon_code,
      external_link,
      terms,
      is_featured,
      status,
      image_url
    } = body;

    if (!promotionId) {
      return json({ success: false, error: 'Promotion ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (promotion_type !== undefined) updateData.promotion_type = promotion_type;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (coupon_code !== undefined) updateData.coupon_code = coupon_code;
    if (external_link !== undefined) updateData.external_link = external_link;
    if (terms !== undefined) updateData.terms = terms;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (status !== undefined) updateData.status = status;
    if (image_url !== undefined) updateData.image_url = image_url;

    const { data: promotion, error: promotionError } = await auth.supabaseAdmin
      .from('promotions')
      .update(updateData)
      .eq('id', promotionId)
      .select()
      .single();

    if (promotionError) {
      console.error('Error updating promotion:', promotionError);
      return json(
        { success: false, error: `Failed to update promotion: ${promotionError.message}` },
        { status: 500 }
      );
    }

    return json({ success: true, promotion });
  } catch (error) {
    console.error('Update promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE: Delete promotion
export const DELETE: RequestHandler = async ({ url, cookies }) => {
  try {
    const auth = await verifySuperAdmin(cookies);
    if ('error' in auth) {
      return json({ success: false, error: auth.error }, { status: auth.status });
    }

    const promotionId = url.searchParams.get('promotionId');
    if (!promotionId) {
      return json({ success: false, error: 'Promotion ID is required' }, { status: 400 });
    }

    const { error } = await auth.supabaseAdmin
      .from('promotions')
      .delete()
      .eq('id', promotionId);

    if (error) {
      console.error('Error deleting promotion:', error);
      return json(
        { success: false, error: `Failed to delete promotion: ${error.message}` },
        { status: 500 }
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};



