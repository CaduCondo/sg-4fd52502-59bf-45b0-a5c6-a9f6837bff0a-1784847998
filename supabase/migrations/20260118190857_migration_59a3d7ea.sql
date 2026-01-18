-- Deletar função existente e recriar corretamente
DROP FUNCTION IF EXISTS authenticate_user_with_auth(text, text);

CREATE OR REPLACE FUNCTION authenticate_user_with_auth(
  p_username_or_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  username TEXT,
  role TEXT,
  phone TEXT,
  rg TEXT,
  cpf TEXT,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  photo TEXT,
  auth_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_password_valid BOOLEAN := FALSE;
BEGIN
  -- Buscar usuário por email ou username
  SELECT * INTO v_user
  FROM system_users
  WHERE system_users.email = p_username_or_email
     OR system_users.username = p_username_or_email
  LIMIT 1;

  -- Se usuário não encontrado, retornar vazio
  IF v_user.id IS NULL THEN
    RETURN;
  END IF;

  -- Verificar senha com bcrypt (se password_hash existe)
  IF v_user.password_hash IS NOT NULL THEN
    v_password_valid := (v_user.password_hash = crypt(p_password, v_user.password_hash));
  ELSE
    -- Fallback: senha em texto plano (para migração)
    v_password_valid := (v_user.password = p_password);
    
    -- Se senha texto plano for válida, migrar para bcrypt
    IF v_password_valid THEN
      UPDATE system_users
      SET password_hash = crypt(p_password, gen_salt('bf')),
          updated_at = NOW()
      WHERE id = v_user.id;
      
      -- Atualizar v_user com novo hash
      SELECT * INTO v_user
      FROM system_users
      WHERE id = v_user.id;
    END IF;
  END IF;

  -- Se senha inválida, retornar vazio
  IF NOT v_password_valid THEN
    RETURN;
  END IF;

  -- Retornar dados do usuário autenticado
  RETURN QUERY
  SELECT 
    v_user.id,
    v_user.name,
    v_user.email,
    v_user.username,
    v_user.role,
    v_user.phone,
    v_user.rg,
    v_user.cpf,
    v_user.active,
    v_user.created_at,
    v_user.photo,
    v_user.auth_user_id;
END;
$$;

COMMENT ON FUNCTION authenticate_user_with_auth IS 'Autentica usuário com bcrypt. Migra automaticamente senhas antigas. Retorna dados completos do usuário.';