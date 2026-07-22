-- Aplicar EXATAMENTE as mesmas políticas RLS de properties na tabela payment_methods
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;

-- Copiar política SELECT de properties
CREATE POLICY payment_methods_select ON payment_methods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.active = true
    )
  );

-- Copiar política INSERT de properties
CREATE POLICY payment_methods_insert ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.active = true
    )
  );

-- Copiar política UPDATE de properties
CREATE POLICY payment_methods_update ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.active = true
    )
  );

-- Copiar política DELETE de properties
CREATE POLICY payment_methods_delete ON payment_methods
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.active = true
        AND system_users.role = 'admin'
    )
  );