-- 1. Criar nova tabela de locais isentos de taxa de administração
CREATE TABLE IF NOT EXISTS admin_fee_exempt_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id)
);

COMMENT ON TABLE admin_fee_exempt_locations IS 'Locais onde a taxa de administração NÃO é cobrada';
COMMENT ON COLUMN admin_fee_exempt_locations.location_id IS 'ID do local isento de taxa de administração';

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_fee_exempt_locations_location_id ON admin_fee_exempt_locations(location_id);

-- 3. Habilitar RLS
ALTER TABLE admin_fee_exempt_locations ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (apenas admins podem gerenciar)
CREATE POLICY "Admins can manage admin fee exemptions" ON admin_fee_exempt_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Política de leitura para todos usuários autenticados
CREATE POLICY "Authenticated users can view admin fee exemptions" ON admin_fee_exempt_locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);