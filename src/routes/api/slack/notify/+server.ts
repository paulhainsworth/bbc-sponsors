import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const POST: RequestHandler = async ({ request, cookies }) => {
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
  try {
    const body = await request.json();
    const { notificationType, payload } = body;

    // Verify secret key (in production, use proper authentication)
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.SLACK_WEBHOOK_SECRET_KEY;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }


    // Get Slack configuration
    const { data: config } = await supabase
      .from('slack_config')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (!config) {
      return json({ success: false, error: 'Slack not configured' }, { status: 400 });
    }

    // Build notification message based on type
    let message = '';
    let shouldNotify = false;

    switch (notificationType) {
      case 'new_promotion':
        if (!config.notify_new_promotion) break;
        shouldNotify = true;
        const { data: promotion } = await supabase
          .from('promotions')
          .select('*, sponsors(name, slug)')
          .eq('id', payload.promotionId)
          .single();
        
        if (promotion) {
          message = `🎉 New Sponsor Offer from ${promotion.sponsors.name}!\n\n${promotion.title}\n\n${promotion.description.substring(0, 150)}...`;
          if (promotion.end_date) {
            message += `\n📅 Valid until: ${new Date(promotion.end_date).toLocaleDateString()}`;
          }
          if (promotion.coupon_code) {
            message += `\n💰 Code: ${promotion.coupon_code}`;
          }
          message += `\n👉 View details: ${process.env.PUBLIC_APP_URL}/sponsors/${promotion.sponsors.slug}`;
        }
        break;

      case 'featured_promotion':
        if (!config.notify_featured_promotion) break;
        shouldNotify = true;
        // Similar logic for featured promotions
        break;

      case 'new_sponsor':
        if (!config.notify_new_sponsor) break;
        shouldNotify = true;
        const { data: sponsor } = await supabase
          .from('sponsors')
          .select('*')
          .eq('id', payload.sponsorId)
          .single();
        
        if (sponsor) {
          message = `🚴 Welcome our newest sponsor: ${sponsor.name}!\n\n${sponsor.tagline || ''}\n\n${(sponsor.description || '').substring(0, 200)}...`;
          message += `\nExplore their offers: ${process.env.PUBLIC_APP_URL}/sponsors/${sponsor.slug}`;
        }
        break;

      case 'blog_post':
        if (!config.notify_blog_post) break;
        shouldNotify = true;
        const { data: post } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', payload.postId)
          .single();
        
        if (post) {
          message = `📰 Sponsor News: ${post.title}\n\n${(post.excerpt || post.content.substring(0, 200)).replace(/<[^>]*>/g, '')}...`;
          message += `\nRead more: ${process.env.PUBLIC_APP_URL}/news/${post.slug}`;
        }
        break;
    }

    if (!shouldNotify || !message) {
      return json({ success: false, error: 'Notification not enabled or invalid type' });
    }

    // Send to Slack
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });

    const notificationId = crypto.randomUUID();

    // Log notification
    await supabase.from('slack_notifications').insert({
      notification_type: notificationType,
      payload: payload,
      status: response.ok ? 'sent' : 'failed',
      error_message: response.ok ? null : await response.text(),
      attempts: 1,
      sent_at: response.ok ? new Date().toISOString() : null
    });

    if (!response.ok) {
      return json({ success: false, error: 'Failed to send to Slack' }, { status: 500 });
    }

    return json({ success: true, notificationId });
  } catch (error) {
    console.error('Slack notification error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

