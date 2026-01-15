-- Criar tabela config se não existir
CREATE TABLE IF NOT EXISTS config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_fee_percentage DECIMAL NOT NULL DEFAULT 6.0,
  late_fee_percentage DECIMAL NOT NULL DEFAULT 2.0,
  interest_rate_percentage DECIMAL NOT NULL DEFAULT 1.0,
  locations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
CREATE POLICY "Anyone can view config" ON config FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update config" ON config FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert config" ON config FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Inserir configuração padrão se não existir
INSERT INTO config (admin_fee_percentage, late_fee_percentage, interest_rate_percentage, locations)
SELECT 6.0, 2.0, 1.0, '["Jd. Colombo", "Jd. Santa Lúcia", "Pq. União", "Jd. Presidente Dutra"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM config LIMIT 1);