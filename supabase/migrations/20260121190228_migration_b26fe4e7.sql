-- Verificar e corrigir políticas RLS para user_fee_exemptions
DROP POLICY IF EXISTS "Admin can view all fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can create fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can delete fee exemptions" ON user_fee_exemptions;

-- Política para SELECT
CREATE POLICY "Allow admin to view fee exemptions" ON user_fee_exemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE system_users.id = auth.uid() 
      AND system_users.role = 'admin'
    )
  );

-- Política para INSERT
CREATE POLICY "Allow admin to insert fee exemptions" ON user_fee_exemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE system_users.id = auth.uid() 
      AND system_users.role = 'admin'
    )
  );

-- Política para DELETE
CREATE POLICY "Allow admin to delete fee exemptions" ON user_fee_exemptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE system_users.id = auth.uid() 
      AND system_users.role = 'admin'
    )
  );