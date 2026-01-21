-- Criar tabela para armazenar isenções de taxa por corretor
CREATE TABLE IF NOT EXISTS user_fee_exemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Habilitar RLS
ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode visualizar isenções" ON user_fee_exemptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM system_users
    WHERE system_users.id = auth.uid()
    AND system_users.role IN ('admin', 'financial')
  )
);

CREATE POLICY "Admin pode inserir isenções" ON user_fee_exemptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_users
    WHERE system_users.id = auth.uid()
    AND system_users.role IN ('admin', 'financial')
  )
);

CREATE POLICY "Admin pode atualizar isenções" ON user_fee_exemptions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM system_users
    WHERE system_users.id = auth.uid()
    AND system_users.role IN ('admin', 'financial')
  )
);

CREATE POLICY "Admin pode deletar isenções" ON user_fee_exemptions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM system_users
    WHERE system_users.id = auth.uid()
    AND system_users.role IN ('admin', 'financial')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_fee_exemptions_user_id ON user_fee_exemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fee_exemptions_location_id ON user_fee_exemptions(location_id);