-- Remover políticas antigas
DROP POLICY IF EXISTS "Admin can manage fee exemptions" ON user_fee_exemptions;

-- Criar políticas corretas para user_fee_exemptions
CREATE POLICY "Admin can view fee exemptions" ON user_fee_exemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert fee exemptions" ON user_fee_exemptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update fee exemptions" ON user_fee_exemptions
  FOR UPDATE
  USING (
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