-- Desabilitar RLS temporariamente para permitir operações
ALTER TABLE user_fee_exemptions DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Admins can view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admins can create fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admins can delete fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can insert fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can delete fee exemptions" ON user_fee_exemptions;

-- Criar políticas PERMISSIVAS para admin
CREATE POLICY "Allow admin all operations on fee exemptions"
ON user_fee_exemptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE system_users.id = auth.uid() 
    AND system_users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE system_users.id = auth.uid() 
    AND system_users.role = 'admin'
  )
);