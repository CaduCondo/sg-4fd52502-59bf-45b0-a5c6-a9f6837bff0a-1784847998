-- Adicionar campos usuario e phone na tabela system_users
ALTER TABLE system_users 
ADD COLUMN IF NOT EXISTS usuario text UNIQUE,
ADD COLUMN IF NOT EXISTS phone text;

-- Criar índice para busca por usuario
CREATE INDEX IF NOT EXISTS idx_system_users_usuario ON system_users(usuario);

-- Comentários para documentação
COMMENT ON COLUMN system_users.usuario IS 'Nome de usuário único para login (alternativa ao email)';
COMMENT ON COLUMN system_users.phone IS 'Número de telefone/celular do usuário';