-- Criar tabela para armazenar isenções de taxa de administração
CREATE TABLE IF NOT EXISTS broker_fee_exemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Criar políticas RLS
ALTER TABLE broker_fee_exemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON broker_fee_exemptions FOR ALL USING (true) WITH CHECK (true);