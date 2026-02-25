-- ETAPA 1: SEGURANÇA URGENTE
-- Remover colunas de segurança e duplicatas de system_users

-- 1.1. Consolidar 'usuario' em 'username' (se houver dados diferentes)
UPDATE system_users
SET username = COALESCE(NULLIF(username, ''), usuario)
WHERE username IS NULL OR username = '';

-- 1.2. Remover coluna 'password' (DEPRECATED - texto plano)
ALTER TABLE system_users DROP COLUMN IF EXISTS password;

-- 1.3. Remover coluna 'usuario' (DUPLICADA com username)
ALTER TABLE system_users DROP COLUMN IF EXISTS usuario;

-- Confirmar limpeza
SELECT 'Etapa 1 concluída: Colunas de segurança removidas!' as message;