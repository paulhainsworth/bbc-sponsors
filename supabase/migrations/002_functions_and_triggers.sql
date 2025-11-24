-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_config_updated_at BEFORE UPDATE ON slack_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire promotions
CREATE OR REPLACE FUNCTION expire_promotions()
RETURNS void AS $$
BEGIN
  UPDATE promotions
  SET status = 'expired'
  WHERE status = 'active'
  AND end_date IS NOT NULL
  AND end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check featured promotion limit
CREATE OR REPLACE FUNCTION check_featured_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = TRUE THEN
    IF (SELECT COUNT(*) FROM promotions WHERE is_featured = TRUE AND status = 'active' AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 8 THEN
      RAISE EXCEPTION 'Maximum of 8 featured promotions allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_featured_limit_trigger
  BEFORE INSERT OR UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION check_featured_limit();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_slug(base_text TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
  counter INTEGER := 0;
BEGIN
  slug := LOWER(REGEXP_REPLACE(base_text, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := TRIM(BOTH '-' FROM slug);
  
  WHILE EXISTS (SELECT 1 FROM sponsors WHERE sponsors.slug = slug) LOOP
    counter := counter + 1;
    slug := slug || '-' || counter;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

