-- Recriar as políticas RLS corretamente (sem referência a status que não existe)
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;

-- SELECT: Qualquer usuário autenticado pode visualizar
CREATE POLICY payment_methods_select ON payment_methods
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Admin, Financial e Management podem inserir
CREATE POLICY payment_methods_insert ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.role IN ('admin', 'financial', 'management')
        AND system_users.active = true
    )
  );

-- UPDATE: Admin, Financial e Management podem atualizar
CREATE POLICY payment_methods_update ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.role IN ('admin', 'financial', 'management')
        AND system_users.active = true
    )
  );

-- DELETE: Apenas Admin pode deletar
CREATE POLICY payment_methods_delete ON payment_methods
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM system_users
      WHERE system_users.auth_user_id = auth.uid()
        AND system_users.role = 'admin'
        AND system_users.active = true
    )
  );