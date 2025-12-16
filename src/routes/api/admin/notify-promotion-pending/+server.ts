/**
 * Server-side API endpoint to notify super admins of pending promotion
 * Sends email notification to all super admins
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedSecret = env.SLACK_WEBHOOK_SECRET_KEY;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promotionId, sponsorId } = body;

    if (!promotionId || !sponsorId) {
      return json({ success: false, error: 'Missing promotionId or sponsorId' }, { status: 400 });
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

    // Get promotion and sponsor details
    const { data: promotion, error: promotionError } = await supabaseAdmin
      .from('promotions')
      .select('*, sponsors(name, slug)')
      .eq('id', promotionId)
      .single();

    if (promotionError || !promotion) {
      return json({ success: false, error: 'Promotion not found' }, { status: 404 });
    }

    // Get all super admins
    const { data: superAdmins, error: adminsError } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name')
      .eq('role', 'super_admin');

    if (adminsError || !superAdmins || superAdmins.length === 0) {
      console.error('No super admins found or error:', adminsError);
      return json({ success: false, error: 'No super admins found' }, { status: 404 });
    }

    // Send email to each super admin
    // Note: You'll need to configure your email service (SendGrid, Resend, etc.)
    // For now, we'll log the notification
    const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';
    const approvalUrl = `${appUrl}/admin/promotions/${promotionId}/approve`;

    console.log('=== PROMOTION PENDING APPROVAL ===');
    console.log(`Promotion: ${promotion.title}`);
    console.log(`Sponsor: ${promotion.sponsors?.name}`);
    console.log(`Approval URL: ${approvalUrl}`);
    console.log('Super Admins to notify:');
    superAdmins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.display_name || 'No name'})`);
    });
    console.log('===================================');

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, return success - email integration will be added next
    return json({
      success: true,
      message: `Notification logged for ${superAdmins.length} super admin(s)`,
      admins: superAdmins.map(a => a.email)
    });
  } catch (error) {
    console.error('Notify promotion pending error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};










