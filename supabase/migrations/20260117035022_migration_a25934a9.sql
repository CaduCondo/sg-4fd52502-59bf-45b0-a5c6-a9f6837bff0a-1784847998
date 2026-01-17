-- Garantir que as colunas existam na tabela system_users
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS cpf text;

-- Criar índice para username se não existir (para login rápido)
CREATE INDEX IF NOT EXISTS idx_system_users_username ON system_users(username);