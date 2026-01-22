-- Adicionar campos para imagens, móveis planejados e aceita pets na tabela properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS has_furniture boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_pets boolean DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN properties.images IS 'Array de URLs das imagens/fotos do imóvel';
COMMENT ON COLUMN properties.has_furniture IS 'Indica se o imóvel possui móveis planejados';
COMMENT ON COLUMN properties.accepts_pets IS 'Indica se o imóvel aceita animais de estimação';