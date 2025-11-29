/**
 * Server-side API endpoint to update sponsor profile
 * This bypasses RLS by using the service role key
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { sponsorUpdateSchema } from '$lib/utils/validators';

export const POST: RequestHandler = async ({ request, cookies }) => {
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

    // Get form data from request
    const body = await request.json();
    const {
      tagline,
      description,
      category,
      website_url,
      contact_email,
      contact_phone,
      address_street,
      address_city,
      address_state,
      address_zip,
      social_instagram,
      social_facebook,
      social_strava,
      social_twitter
    } = body;

    // Clean up empty strings to null for optional fields
    const cleanedData = {
      tagline: tagline?.trim() || null,
      description: description?.trim() || null,
      category: category || [],
      website_url: website_url?.trim() || null,
      contact_email: contact_email?.trim() || null,
      contact_phone: contact_phone?.trim() || null,
      address_street: address_street?.trim() || null,
      address_city: address_city?.trim() || null,
      address_state: address_state?.trim() || null,
      address_zip: address_zip?.trim() || null,
      social_instagram: social_instagram?.trim() || null,
      social_facebook: social_facebook?.trim() || null,
      social_strava: social_strava?.trim() || null,
      social_twitter: social_twitter?.trim() || null
    };

    // Validate form data (using update schema which doesn't require name)
    const result = sponsorUpdateSchema.safeParse(cleanedData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      return json({ success: false, error: 'Validation failed', errors }, { status: 400 });
    }

    // Update sponsor (sponsor admins can only update certain fields, not name/slug)
    const { data: updatedSponsor, error: updateError } = await supabaseAdmin
      .from('sponsors')
      .update({
        tagline: cleanedData.tagline,
        description: cleanedData.description,
        category: cleanedData.category,
        website_url: cleanedData.website_url,
        contact_email: cleanedData.contact_email,
        contact_phone: cleanedData.contact_phone,
        address_street: cleanedData.address_street,
        address_city: cleanedData.address_city,
        address_state: cleanedData.address_state,
        address_zip: cleanedData.address_zip,
        social_instagram: cleanedData.social_instagram,
        social_facebook: cleanedData.social_facebook,
        social_strava: cleanedData.social_strava,
        social_twitter: cleanedData.social_twitter
      })
      .eq('id', sponsorAdmin.sponsor_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating sponsor:', updateError);
      return json(
        { success: false, error: `Failed to update sponsor: ${updateError.message}` },
        { status: 500 }
      );
    }

    return json({
      success: true,
      sponsor: updatedSponsor
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

