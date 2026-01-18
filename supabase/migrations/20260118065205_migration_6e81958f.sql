-- Criar tabela de permissões de locais por usuário
CREATE TABLE IF NOT EXISTS user_location_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_location_permissions_user_id ON user_location_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_permissions_location_id ON user_location_permissions(location_id);

-- RLS Policies
ALTER TABLE user_location_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view location permissions" 
ON user_location_permissions FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage location permissions" 
ON user_location_permissions FOR ALL 
USING (auth.uid() IS NOT NULL);