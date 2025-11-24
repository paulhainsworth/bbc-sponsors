-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'sponsor_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  category TEXT[] DEFAULT ARRAY[]::TEXT[],
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_strava TEXT,
  social_twitter TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsor admins junction table
CREATE TABLE IF NOT EXISTS sponsor_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sponsor_id, user_id)
);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('evergreen', 'time_limited', 'coupon_code', 'external_link')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  coupon_code TEXT,
  external_link TEXT,
  terms TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog posts to sponsors junction (for tagging)
CREATE TABLE IF NOT EXISTS blog_post_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  UNIQUE(post_id, sponsor_id)
);

-- Slack configuration table
CREATE TABLE IF NOT EXISTS slack_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  notify_new_promotion BOOLEAN DEFAULT TRUE,
  notify_featured_promotion BOOLEAN DEFAULT TRUE,
  notify_new_sponsor BOOLEAN DEFAULT TRUE,
  notify_blog_post BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack notifications log
CREATE TABLE IF NOT EXISTS slack_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation tokens table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'sponsor_admin')),
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sponsors_slug ON sponsors(slug);
CREATE INDEX IF NOT EXISTS idx_sponsors_status ON sponsors(status);
CREATE INDEX IF NOT EXISTS idx_promotions_sponsor ON promotions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_featured ON promotions(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_analytics_sponsor ON analytics_events(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_promotion ON analytics_events(promotion_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

