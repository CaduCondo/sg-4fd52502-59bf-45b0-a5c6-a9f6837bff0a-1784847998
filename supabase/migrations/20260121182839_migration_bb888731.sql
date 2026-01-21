DROP POLICY IF EXISTS "Admin can view all fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can create fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can delete fee exemptions" ON user_fee_exemptions;

CREATE POLICY "Admin can view all fee exemptions" ON user_fee_exemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can create fee exemptions" ON user_fee_exemptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete fee exemptions" ON user_fee_exemptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid() AND role = 'admin'
    )
  );