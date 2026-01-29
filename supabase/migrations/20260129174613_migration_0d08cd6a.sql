-- Criar índice em locations para acelerar o JOIN
CREATE INDEX IF NOT EXISTS idx_locations_id ON locations(id);