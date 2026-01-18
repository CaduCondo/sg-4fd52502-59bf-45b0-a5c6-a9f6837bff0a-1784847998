-- Criar índice para melhor performance nas JOINs
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON properties(location_id);