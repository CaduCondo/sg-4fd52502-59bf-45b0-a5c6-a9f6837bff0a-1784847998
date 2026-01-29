-- Remove o índice composto que pode estar causando lentidão
DROP INDEX IF EXISTS idx_properties_status_created_at;

-- Cria índice simples para ordenação por data (mais eficiente)
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Cria índice para valor (caso precise ordenar por preço)
CREATE INDEX IF NOT EXISTS idx_properties_value ON properties(value);

-- Cria índice para área (caso precise ordenar por área)
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area);