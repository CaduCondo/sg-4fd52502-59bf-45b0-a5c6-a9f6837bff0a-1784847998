-- Criar índice composto em locations para otimizar filtros combinados
CREATE INDEX IF NOT EXISTS idx_locations_active_city_state 
ON locations(is_active, city, state) 
WHERE is_active = true;