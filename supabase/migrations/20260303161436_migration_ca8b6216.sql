-- Habilitar extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualizar usuário cadu.pires com hash gerado pelo PostgreSQL nativo
UPDATE system_users
SET 
  password_hash = crypt('teste123', gen_salt('bf')),
  login_attempts = 0,
  blocked_until = NULL,
  active = true,
  updated_at = NOW()
WHERE username = 'cadu.pires'
RETURNING 
  id,
  username,
  email,
  name,
  role,
  active,
  login_attempts,
  substring(password_hash, 1, 29) as hash_preview,
  length(password_hash) as hash_length;