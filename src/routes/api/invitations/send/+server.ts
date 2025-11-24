import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_APP_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, role, sponsorId, sponsorName, adminName } = body;

    if (!email || !role) {
      return json({ success: false, error: 'Email and role are required' }, { status: 400 });
    }

    // Use service role client for admin operations
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

    // Get current user from session (for created_by)
    const supabaseClient = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get: (key) => cookies.get(key),
        set: () => {},
        remove: () => {}
      }
    });

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();
    const createdBy = session?.user?.id || null;

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        role,
        sponsor_id: sponsorId || null,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return json({ success: false, error: inviteError.message }, { status: 500 });
    }

    // Send invitation email via Supabase Auth Admin API
    const invitationUrl = `${PUBLIC_APP_URL}/auth/accept-invitation?token=${token}`;

    try {
      // Try to send invitation email via Supabase Auth Admin API
      const { data: inviteData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            role,
            sponsor_id: sponsorId,
            invitation_token: token,
            sponsor_name: sponsorName
          },
          redirectTo: invitationUrl
        }
      );

      if (authError) {
        console.error('Supabase Auth invite error:', authError);
        // The invitation record was created successfully, so return success
        // but indicate email sending failed
        return json({
          success: true,
          invitationId: invitation.id,
          invitationUrl,
          message: 'Invitation created successfully, but automatic email sending failed.',
          warning: authError.message,
          emailSent: false
        });
      }

      console.log('Invitation email sent successfully via Supabase Auth');
      return json({
        success: true,
        invitationId: invitation.id,
        invitationUrl,
        message: 'Invitation email sent successfully',
        emailSent: true
      });
    } catch (authError: any) {
      console.error('Auth invite exception:', authError);
      // Return success since invitation was created, but email failed
      return json({
        success: true,
        invitationId: invitation.id,
        invitationUrl,
        message: 'Invitation created. Automatic email sending is not available.',
        warning: authError?.message || 'Email service unavailable',
        emailSent: false
      });
    }
  } catch (error) {
    console.error('Invitation error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

