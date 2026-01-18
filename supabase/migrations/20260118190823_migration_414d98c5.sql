-- Adicionar coluna password_hash se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE system_users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Adicionar coluna auth_user_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE system_users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;