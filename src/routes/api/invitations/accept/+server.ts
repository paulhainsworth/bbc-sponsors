import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { token, userId, email, role, sponsorId } = body;

    if (!token || !userId || !email || !role) {
      return json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role client for admin operations (bypasses RLS)
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

    // Verify the user is authenticated
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

    if (!session || session.user.id !== userId) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify invitation is valid
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return json({ success: false, error: 'Invalid or expired invitation' }, { status: 404 });
    }

    if (invitation.accepted_at) {
      return json({ success: false, error: 'Invitation already accepted' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return json({ success: false, error: 'Invitation expired' }, { status: 400 });
    }

    // Create or update profile using admin client (bypasses RLS)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: email,
      role: role,
      display_name: email.split('@')[0]
    }, {
      onConflict: 'id'
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return json({ success: false, error: `Failed to create profile: ${profileError.message}` }, { status: 500 });
    }

    // If sponsor admin, link to sponsor
    // Use invitation.sponsor_id as the source of truth (not the request body)
    const actualSponsorId = invitation.sponsor_id || sponsorId;
    
    console.log('Processing sponsor admin link:', {
      role,
      invitationSponsorId: invitation.sponsor_id,
      requestSponsorId: sponsorId,
      actualSponsorId,
      userId,
      email
    });
    
    if (role === 'sponsor_admin') {
      if (!actualSponsorId) {
        console.error('Sponsor admin role but no sponsor_id available', {
          invitation: invitation.sponsor_id,
          request: sponsorId
        });
        return json({ 
          success: false, 
          error: 'Sponsor admin invitation is missing sponsor_id' 
        }, { status: 400 });
      }

      // Create the sponsor_admins link
      const { error: linkError, data: linkData } = await supabaseAdmin
        .from('sponsor_admins')
        .upsert({
          sponsor_id: actualSponsorId,
          user_id: userId
        }, {
          onConflict: 'sponsor_id,user_id'
        })
        .select();

      if (linkError) {
        console.error('Sponsor admin link error:', linkError);
        return json({ 
          success: false, 
          error: `Failed to link sponsor admin: ${linkError.message}` 
        }, { status: 500 });
      }
      
      if (!linkData || linkData.length === 0) {
        console.error('Sponsor admin link created but no data returned');
        // Try to verify it was created
        const { data: verifyData } = await supabaseAdmin
          .from('sponsor_admins')
          .select('*')
          .eq('user_id', userId)
          .eq('sponsor_id', actualSponsorId)
          .single();
        
        if (!verifyData) {
          return json({ 
            success: false, 
            error: 'Failed to verify sponsor admin link was created' 
          }, { status: 500 });
        }
      }
      
      console.log('Sponsor admin linked successfully:', linkData || 'verified');
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail, but log it
    }

    return json({ success: true, message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

