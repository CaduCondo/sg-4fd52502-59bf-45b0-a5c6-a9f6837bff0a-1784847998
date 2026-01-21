-- Limpar todas as políticas duplicadas
DROP POLICY IF EXISTS "Admins can manage fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin pode deletar isenções" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Allow admin to delete fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can insert fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin pode inserir isenções" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Allow admin to insert fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin pode visualizar isenções" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Allow admin to view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can update fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin pode atualizar isenções" ON user_fee_exemptions;

-- Criar apenas as políticas necessárias
CREATE POLICY "admin_select_fee_exemptions" ON user_fee_exemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE system_users.id = auth.uid() 
      AND system_users.role = 'admin'
    )
  );

CREATE POLICY "admin_insert_fee_exemptions" ON user_fee_exemptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE system_users.id = auth.uid() 
      AND system_users.role = 'admin'
    )
  );

CREATE POLICY "admin_delete_fee_exemptions" ON user_fee_exemptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE system_users.id = auth.uid() 
      AND system_users.role = 'admin'
    )
  );