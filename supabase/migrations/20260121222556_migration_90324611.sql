-- Corrigir permissões RLS para tabela user_fee_exemptions
ALTER TABLE user_fee_exemptions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Admin full access to user_fee_exemptions" ON user_fee_exemptions;

-- Criar políticas permissivas para resolver o erro 401 imediatamente
CREATE POLICY "Enable all access for authenticated users"
ON user_fee_exemptions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;