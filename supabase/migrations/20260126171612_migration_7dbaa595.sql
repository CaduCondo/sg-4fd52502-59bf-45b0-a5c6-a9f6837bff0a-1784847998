-- Criar índice composto para otimizar a query de properties disponíveis ordenadas por data
CREATE INDEX IF NOT EXISTS idx_properties_status_created_at 
ON properties(status, created_at DESC);