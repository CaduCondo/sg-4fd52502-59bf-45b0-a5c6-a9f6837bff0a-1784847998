-- Remover a política antiga e criar uma nova que verifica role
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON admin_fee_exempt_locations;

-- Criar política que permite apenas para admins e financeiros
CREATE POLICY "Admin and financial can manage exemptions"
  ON admin_fee_exempt_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.id = auth.uid()
      AND system_users.role IN ('admin', 'financial')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.id = auth.uid()
      AND system_users.role IN ('admin', 'financial')
    )
  );