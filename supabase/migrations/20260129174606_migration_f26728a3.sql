-- Criar índices CRÍTICOS para otimizar a query de propriedades disponíveis
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_status_created_at ON properties(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON properties(location_id);