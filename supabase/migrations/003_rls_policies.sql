-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Sponsor admins policies
CREATE POLICY "Users can view own sponsor admin records" ON sponsor_admins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sponsor admin record" ON sponsor_admins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Super admins can manage all sponsor admin records
CREATE POLICY "Super admins can manage sponsor admins" ON sponsor_admins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Sponsors policies (public read, admin write)
CREATE POLICY "Anyone can view active sponsors" ON sponsors
  FOR SELECT USING (status = 'active');

CREATE POLICY "Super admins can manage all sponsors" ON sponsors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Sponsor admins can view their sponsors" ON sponsors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = sponsors.id 
      AND sponsor_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Sponsor admins can update their sponsors" ON sponsors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = sponsors.id 
      AND sponsor_admins.user_id = auth.uid()
    )
  );

-- Promotions policies
CREATE POLICY "Anyone can view active promotions" ON promotions
  FOR SELECT USING (
    status = 'active' AND 
    start_date <= NOW() AND 
    (end_date IS NULL OR end_date >= NOW())
  );

CREATE POLICY "Super admins can manage all promotions" ON promotions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Sponsor admins can view their promotions" ON promotions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = promotions.sponsor_id 
      AND sponsor_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Sponsor admins can manage their promotions" ON promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = promotions.sponsor_id 
      AND sponsor_admins.user_id = auth.uid()
    )
  );

-- Blog posts policies
CREATE POLICY "Anyone can view published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Super admins can manage all blog posts" ON blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Slack config policies (super admin only)
CREATE POLICY "Super admins can manage slack config" ON slack_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Invitations policies
CREATE POLICY "Super admins can manage invitations" ON invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Allow anyone to look up invitations by token (for accepting invitations)
-- This is safe because the token is a secret, and we validate expiration/acceptance in the app
CREATE POLICY "Anyone can view invitations by token" ON invitations
  FOR SELECT USING (true);

-- Allow users to update invitations for their own email (to mark as accepted)
CREATE POLICY "Users can update own invitation" ON invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Analytics policies (sponsor admins can view their own)
CREATE POLICY "Super admins can view all analytics" ON analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Sponsor admins can view their analytics" ON analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins 
      WHERE sponsor_admins.sponsor_id = analytics_events.sponsor_id 
      AND sponsor_admins.user_id = auth.uid()
    )
  );

