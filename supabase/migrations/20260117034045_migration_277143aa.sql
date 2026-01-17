-- Adicionar campos RG e CPF na tabela system_users para mesclar com corretores
ALTER TABLE system_users 
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS cpf text;

COMMENT ON COLUMN system_users.rg IS 'RG do usuário';
COMMENT ON COLUMN system_users.cpf IS 'CPF do usuário';