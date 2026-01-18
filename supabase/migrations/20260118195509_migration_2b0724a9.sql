-- Etapa 3: Criar função de autenticação segura com bcrypt
DROP FUNCTION IF EXISTS authenticate_user_secure CASCADE;

CREATE OR REPLACE FUNCTION authenticate_user_secure(
  p_login TEXT,
  p_password TEXT
)
RETURNS TABLE(
  user_id INTEGER,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  user_active BOOLEAN,
  user_username TEXT,
  user_cpf TEXT,
  user_rg TEXT,
  user_phone TEXT,
  user_photo TEXT,
  auth_id UUID,
  user_created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Buscar usuário por username ou email
  SELECT 
    su.id,
    su.name,
    su.email,
    su.role,
    su.active,
    su.username,
    su.cpf,
    su.rg,
    su.phone,
    su.photo,
    su.auth_user_id,
    su.created_at,
    su.password_hash,
    su.password
  INTO v_user
  FROM system_users su
  WHERE su.username = p_login 
    OR su.email = p_login
  LIMIT 1;

  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Verificar se usuário está ativo
  IF NOT v_user.active THEN
    RAISE EXCEPTION 'Usuário inativo';
  END IF;

  -- Validar senha (primeiro tenta bcrypt, depois fallback para texto puro)
  IF v_user.password_hash IS NOT NULL THEN
    -- Validação com bcrypt
    IF NOT (v_user.password_hash = crypt(p_password, v_user.password_hash)) THEN
      RAISE EXCEPTION 'Senha incorreta';
    END IF;
  ELSIF v_user.password IS NOT NULL THEN
    -- Fallback: validação com texto puro (temporário)
    IF v_user.password != p_password THEN
      RAISE EXCEPTION 'Senha incorreta';
    END IF;
    
    -- Migrar senha para bcrypt automaticamente
    UPDATE system_users
    SET password_hash = crypt(p_password, gen_salt('bf', 10))
    WHERE id = v_user.id;
  ELSE
    RAISE EXCEPTION 'Senha não configurada';
  END IF;

  -- Retornar dados do usuário
  RETURN QUERY
  SELECT 
    v_user.id,
    v_user.name,
    v_user.email,
    v_user.role,
    v_user.active,
    v_user.username,
    v_user.cpf,
    v_user.rg,
    v_user.phone,
    v_user.photo,
    v_user.auth_user_id,
    v_user.created_at;
END;
$$;

-- Adicionar comentário descritivo
COMMENT ON FUNCTION authenticate_user_secure IS 'Função segura de autenticação com bcrypt. Valida credenciais e retorna dados do usuário. Migra automaticamente senhas antigas para bcrypt.';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION authenticate_user_secure TO anon, authenticated;