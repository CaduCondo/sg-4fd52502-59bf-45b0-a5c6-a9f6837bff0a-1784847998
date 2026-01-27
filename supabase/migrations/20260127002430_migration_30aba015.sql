-- Deletar todas as versões específicas das funções
DROP FUNCTION IF EXISTS get_properties_with_locations();
DROP FUNCTION IF EXISTS get_properties_with_locations(p_status text, p_location_id uuid);
DROP FUNCTION IF EXISTS get_available_properties();