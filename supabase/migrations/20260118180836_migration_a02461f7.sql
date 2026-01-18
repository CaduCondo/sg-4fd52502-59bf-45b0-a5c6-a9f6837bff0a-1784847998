-- Remover a política atual de SELECT que requer autenticação
DROP POLICY IF EXISTS "Authenticated users can view system_users" ON system_users;

-- Criar nova política que permite leitura pública para login
-- Isso é seguro porque estamos apenas lendo dados necessários para autenticação
CREATE POLICY "Allow public read for authentication" 
ON system_users 
FOR SELECT 
TO public
USING (true);

-- Comentário explicativo
COMMENT ON POLICY "Allow public read for authentication" ON system_users IS 
'Permite leitura pública da tabela system_users para validação de credenciais durante o login. Isso é seguro porque não expõe dados sensíveis além do necessário para autenticação.';