-- Adicionar campos de controle de tentativas de login e bloqueio na tabela system_users
ALTER TABLE system_users 
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP WITH TIME ZONE NULL;

-- Adicionar comentários explicativos
COMMENT ON COLUMN system_users.login_attempts IS 'Contador de tentativas de login falhadas (reseta ao fazer login com sucesso)';
COMMENT ON COLUMN system_users.blocked_until IS 'Data/hora até quando a conta está bloqueada (após 5 tentativas erradas). NULL = não bloqueado';

-- Criar índice para melhorar performance de consultas de bloqueio
CREATE INDEX IF NOT EXISTS idx_system_users_blocked_until ON system_users(blocked_until);