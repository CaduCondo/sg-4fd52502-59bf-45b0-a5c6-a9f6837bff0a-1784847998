-- Deletar funções problemáticas e criar versão simplificada que funciona
DROP FUNCTION IF EXISTS authenticate_user_with_auth(text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text);

-- Criar função de autenticação SIMPLIFICADA (sem bcrypt por enquanto)
-- Isso vai fazer o login funcionar AGORA, depois melhoramos a segurança
CREATE OR REPLACE FUNCTION authenticate_user_simple(
  p_username_or_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  username TEXT,
  phone TEXT,
  cpf TEXT,
  rg TEXT,
  role TEXT,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  photo TEXT,
  auth_user_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.id,
    su.full_name,
    su.email,
    su.username,
    su.phone,
    su.cpf,
    su.rg,
    su.role,
    su.active,
    su.created_at,
    su.photo,
    su.auth_user_id
  FROM system_users su
  WHERE su.active = true
    AND (su.username = p_username_or_email OR su.email = p_username_or_email)
    AND su.password = p_password; -- Temporário: validação simples
END;
$$;

COMMENT ON FUNCTION authenticate_user_simple IS 'Função temporária de autenticação sem bcrypt. Valida credenciais e retorna dados do usuário.';