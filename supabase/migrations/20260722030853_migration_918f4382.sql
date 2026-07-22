-- Remover políticas antigas
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;

-- Criar novas políticas mais permissivas
CREATE POLICY payment_methods_insert ON payment_methods
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
      AND system_users.role IN ('admin', 'financial', 'management')
    )
  );

CREATE POLICY payment_methods_update ON payment_methods
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
      AND system_users.role IN ('admin', 'financial', 'management')
    )
  );

CREATE POLICY payment_methods_delete ON payment_methods
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
      AND system_users.role = 'admin'
    )
  );