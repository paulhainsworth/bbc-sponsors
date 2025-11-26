import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');

    if (!token) {
      return json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    // Use service role client to bypass RLS
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

    // Fetch invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return json({ success: false, error: 'Invalid or expired invitation link' }, { status: 404 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return json({ success: false, error: 'This invitation has expired' }, { status: 400 });
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return json({ success: false, error: 'This invitation has already been accepted' }, { status: 400 });
    }

    // Return full invitation data (needed for processing)
    return json({
      success: true,
      invitation: invitation
    });
  } catch (error) {
    console.error('Invitation validation error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

