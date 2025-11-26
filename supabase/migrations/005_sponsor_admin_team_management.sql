-- Migration to enable sponsor admins to manage team members for their sponsor

-- Allow sponsor admins to view other sponsor admins for the same sponsor
-- This policy allows a sponsor admin to see all other sponsor admins who are linked to the same sponsor
CREATE POLICY "Sponsor admins can view team members" ON sponsor_admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins sa1
      WHERE sa1.sponsor_id = sponsor_admins.sponsor_id
      AND sa1.user_id = auth.uid()
    )
  );

-- Allow sponsor admins to delete other sponsor admins for the same sponsor
-- (but not themselves - that's handled in the application)
CREATE POLICY "Sponsor admins can remove team members" ON sponsor_admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins sa1
      WHERE sa1.sponsor_id = sponsor_admins.sponsor_id
      AND sa1.user_id = auth.uid()
      AND sa1.user_id != sponsor_admins.user_id  -- Cannot delete yourself
    )
  );

-- Allow sponsor admins to view profiles of team members
-- This is needed to display team member information
-- A sponsor admin can view profiles of users who are also sponsor admins for the same sponsor
CREATE POLICY "Sponsor admins can view team member profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sponsor_admins sa1
      JOIN sponsor_admins sa2 ON sa1.sponsor_id = sa2.sponsor_id
      WHERE sa1.user_id = auth.uid()
      AND sa2.user_id = profiles.id
      AND profiles.role = 'sponsor_admin'
    )
  );

