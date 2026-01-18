-- FASE 1: Adicionar colunas novas (sem deletar nada ainda)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS property_identifier TEXT;

-- Comentário explicativo
COMMENT ON COLUMN properties.location_id IS 'Referência ao local (endereço centralizado)';
COMMENT ON COLUMN properties.property_identifier IS 'Identificador do imóvel dentro do local (ex: Casa 1, Apto 201, Loja A)';