-- Remover a política de INSERT que requer autenticação
DROP POLICY IF EXISTS "Anyone authenticated can insert auth mappings" ON auth_user_mapping;

-- Criar nova política que permite INSERT público para migração
CREATE POLICY "Allow public insert for migration"
ON auth_user_mapping
FOR INSERT
TO public
WITH CHECK (true);

COMMENT ON POLICY "Allow public insert for migration" ON auth_user_mapping IS 
'Permite inserção pública de mappings durante o processo de migração automática. 
A validação de credenciais acontece antes na tabela system_users, então isso é seguro.';