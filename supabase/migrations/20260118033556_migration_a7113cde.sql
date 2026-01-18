-- Criar tabela de mapeamento entre auth.users e system_users
CREATE TABLE IF NOT EXISTS auth_user_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auth_user_id),
  UNIQUE(system_user_id),
  UNIQUE(email)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_auth_user_mapping_auth_id ON auth_user_mapping(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_mapping_system_id ON auth_user_mapping(system_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_mapping_email ON auth_user_mapping(email);

-- Habilitar RLS
ALTER TABLE auth_user_mapping ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ver seus próprios mapeamentos
CREATE POLICY "Users can view own mapping" ON auth_user_mapping
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Política: admins podem ver todos os mapeamentos
CREATE POLICY "Admins can view all mappings" ON auth_user_mapping
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM system_users su
      WHERE su.id::text = auth.uid()::text
      AND su.role = 'admin'
    )
  );

COMMENT ON TABLE auth_user_mapping IS 'Mapeamento entre auth.users e system_users';