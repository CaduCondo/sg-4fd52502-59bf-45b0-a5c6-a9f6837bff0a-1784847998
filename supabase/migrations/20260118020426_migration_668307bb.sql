-- Fase 3: Criar tabela de permissões de acesso por local
CREATE TABLE IF NOT EXISTS user_location_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_location_permissions_user ON user_location_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_permissions_location ON user_location_permissions(location_id);

-- RLS
ALTER TABLE user_location_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias permissões"
  ON user_location_permissions FOR SELECT
  USING (auth.uid()::text = user_id::text OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins gerenciam permissões"
  ON user_location_permissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins atualizam permissões"
  ON user_location_permissions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins deletam permissões"
  ON user_location_permissions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Comentários
COMMENT ON TABLE user_location_permissions IS 'Permissões de acesso de usuários por local';
COMMENT ON COLUMN user_location_permissions.can_view IS 'Usuário pode visualizar imóveis deste local';
COMMENT ON COLUMN user_location_permissions.can_edit IS 'Usuário pode editar imóveis deste local';
COMMENT ON COLUMN user_location_permissions.can_delete IS 'Usuário pode deletar imóveis deste local';