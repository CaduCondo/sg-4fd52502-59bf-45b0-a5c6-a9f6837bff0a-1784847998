-- FASE 1: Adicionar coluna password_hash e criar funções de segurança

-- 1. Adicionar coluna para senha hash (bcrypt)
ALTER TABLE system_users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Comentar a estrutura
COMMENT ON COLUMN system_users.password_hash IS 'Senha hash com bcrypt (substitui password em texto plano)';
COMMENT ON COLUMN system_users.password IS 'DEPRECATED: Será removido após migração completa. Use password_hash.';

-- 3. Criar função para hash de senha (bcrypt)
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(plain_password, gen_salt('bf', 10));
END;
$$;

COMMENT ON FUNCTION hash_password IS 'Gera hash bcrypt de uma senha. Usa cost factor 10 (recomendado).';

-- 4. Criar função para verificar senha
CREATE OR REPLACE FUNCTION verify_password(plain_password TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN password_hash = crypt(plain_password, password_hash);
END;
$$;

COMMENT ON FUNCTION verify_password IS 'Verifica se senha em texto plano corresponde ao hash bcrypt.';

-- 5. Migrar senhas existentes para bcrypt
UPDATE system_users 
SET password_hash = hash_password(password)
WHERE password IS NOT NULL 
  AND password_hash IS NULL;

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_system_users_password_hash 
ON system_users(password_hash) 
WHERE password_hash IS NOT NULL;