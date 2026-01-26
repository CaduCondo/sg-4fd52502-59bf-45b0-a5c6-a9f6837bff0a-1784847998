-- Criar índice simples para status (backup para outras queries)
CREATE INDEX IF NOT EXISTS idx_properties_status 
ON properties(status);