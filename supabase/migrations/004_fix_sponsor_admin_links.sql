-- Migration to fix missing sponsor_admin links
-- This function automatically links sponsor admins to sponsors based on email prefix matching sponsor name

-- Function to auto-link sponsor admins to sponsors by matching email prefix to sponsor name
CREATE OR REPLACE FUNCTION auto_link_sponsor_admins()
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  sponsor_id UUID,
  sponsor_name TEXT,
  linked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO sponsor_admins (sponsor_id, user_id)
  SELECT DISTINCT ON (p.id)
    s.id as sponsor_id,
    p.id as user_id
  FROM profiles p
  CROSS JOIN sponsors s
  WHERE p.role = 'sponsor_admin'
    AND LOWER(SPLIT_PART(p.email, '@', 1)) = LOWER(s.name)
    AND NOT EXISTS (
      SELECT 1 FROM sponsor_admins sa 
      WHERE sa.user_id = p.id
    )
  ON CONFLICT (sponsor_id, user_id) DO NOTHING
  RETURNING 
    sponsor_admins.user_id,
    (SELECT email FROM profiles WHERE id = sponsor_admins.user_id) as user_email,
    sponsor_admins.sponsor_id,
    (SELECT name FROM sponsors WHERE id = sponsor_admins.sponsor_id) as sponsor_name,
    true as linked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to fix existing missing links
SELECT * FROM auto_link_sponsor_admins();

-- Also create a view to check for missing links
CREATE OR REPLACE VIEW missing_sponsor_admin_links AS
SELECT 
  p.id as user_id,
  p.email as user_email,
  p.role,
  s.id as sponsor_id,
  s.name as sponsor_name,
  CASE 
    WHEN LOWER(SPLIT_PART(p.email, '@', 1)) = LOWER(s.name) THEN true
    ELSE false
  END as can_auto_link
FROM profiles p
CROSS JOIN sponsors s
WHERE p.role = 'sponsor_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sponsor_admins sa 
    WHERE sa.user_id = p.id
  )
ORDER BY p.email, s.name;



