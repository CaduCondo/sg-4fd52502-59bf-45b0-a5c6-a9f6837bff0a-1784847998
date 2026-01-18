-- Recriar função com nomes corretos das colunas
DROP FUNCTION IF EXISTS authenticate_user_simple;

CREATE OR REPLACE FUNCTION authenticate_user_simple(
  p_username_or_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  user_active BOOLEAN,
  user_username TEXT,
  user_usuario TEXT,
  user_phone TEXT,
  user_cpf TEXT,
  user_rg TEXT,
  user_photo TEXT,
  auth_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.id,
    su.name,
    su.email,
    su.role,
    su.active,
    su.username,
    su.usuario,
    su.phone,
    su.cpf,
    su.rg,
    su.photo,
    su.auth_user_id
  FROM system_users su
  WHERE 
    (su.email = p_username_or_email OR su.username = p_username_or_email OR su.usuario = p_username_or_email)
    AND su.password = p_password
    AND su.active = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user_simple TO anon, authenticated;

COMMENT ON FUNCTION authenticate_user_simple IS 'Função temporária de autenticação. Valida credenciais e retorna dados do usuário usando nomes corretos das colunas.';