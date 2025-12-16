/**
 * Server-side API endpoint for super admin to upload sponsor logo
 * This handles file upload to Supabase Storage for any sponsor
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

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

    // Verify user is a super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return json(
        { success: false, error: 'Only super admins can upload sponsor logos' },
        { status: 403 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const sponsorId = formData.get('sponsorId') as string;

    if (!sponsorId) {
      return json(
        { success: false, error: 'Sponsor ID is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Verify sponsor exists
    const { data: sponsor, error: sponsorError } = await supabaseAdmin
      .from('sponsors')
      .select('id, name')
      .eq('id', sponsorId)
      .single();

    if (sponsorError || !sponsor) {
      return json(
        { success: false, error: 'Sponsor not found' },
        { status: 404 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json(
        { success: false, error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return json(
        { success: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${sponsorId}/${Date.now()}.${fileExt}`;
    const filePath = `sponsor-logos/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('sponsor-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return json(
        { success: false, error: `Failed to upload logo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('sponsor-logos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update sponsor record with logo URL
    const { error: updateError } = await supabaseAdmin
      .from('sponsors')
      .update({ logo_url: publicUrl })
      .eq('id', sponsorId);

    if (updateError) {
      console.error('Error updating sponsor logo URL:', updateError);
      // Try to delete the uploaded file
      await supabaseAdmin.storage.from('sponsor-logos').remove([filePath]);
      return json(
        { success: false, error: `Failed to update sponsor: ${updateError.message}` },
        { status: 500 }
      );
    }

    return json({
      success: true,
      logoUrl: publicUrl
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};



