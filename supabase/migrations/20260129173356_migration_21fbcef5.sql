-- Remover índices criados na última migração (20260128014515)
DROP INDEX IF EXISTS idx_properties_location_id;
DROP INDEX IF EXISTS idx_properties_status;
DROP INDEX IF EXISTS idx_properties_location_status;
DROP INDEX IF EXISTS idx_properties_created_at;