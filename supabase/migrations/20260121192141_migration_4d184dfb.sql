-- Desabilitar RLS temporariamente para diagnosticar
ALTER TABLE user_fee_exemptions DISABLE ROW LEVEL SECURITY;

-- Reabilitar com políticas mais permissivas
ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Admins can view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admins can create fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admins can delete fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can insert fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can delete fee exemptions" ON user_fee_exemptions;

-- Criar política permissiva para usuários autenticados admin
CREATE POLICY "Allow all for admins" ON user_fee_exemptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );