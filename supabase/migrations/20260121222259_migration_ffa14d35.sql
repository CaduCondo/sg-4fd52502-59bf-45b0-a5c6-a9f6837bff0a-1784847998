-- Desabilitar RLS e recriar políticas corretas para user_fee_exemptions
ALTER TABLE user_fee_exemptions DISABLE ROW LEVEL SECURITY;

-- Dropar políticas existentes
DROP POLICY IF EXISTS "Admin full access to fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can manage fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can view fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can insert fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin can delete fee exemptions" ON user_fee_exemptions;

-- Reabilitar RLS
ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;

-- Criar política única para admin com acesso total
CREATE POLICY "Admin full access to user_fee_exemptions"
ON user_fee_exemptions
FOR ALL
TO authenticated
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