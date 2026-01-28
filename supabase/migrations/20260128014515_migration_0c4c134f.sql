-- Criar índices críticos para otimizar queries de properties

-- Índice para location_id (usado em TODOS os JOINs)
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON properties(location_id);

-- Índice para status (filtro muito comum)
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Índice composto para queries que filtram por location + status
CREATE INDEX IF NOT EXISTS idx_properties_location_status ON properties(location_id, status);

-- Índice para created_at (ordenação e filtros de data)
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Comentários para documentação
COMMENT ON INDEX idx_properties_location_id IS 'Otimiza JOINs com tabela locations';
COMMENT ON INDEX idx_properties_status IS 'Otimiza filtros por status (available, occupied, unavailable)';
COMMENT ON INDEX idx_properties_location_status IS 'Otimiza queries combinadas de location + status';
COMMENT ON INDEX idx_properties_created_at IS 'Otimiza ordenação por data de criação';