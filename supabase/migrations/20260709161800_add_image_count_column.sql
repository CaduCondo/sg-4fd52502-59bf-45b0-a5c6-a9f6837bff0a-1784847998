-- ========================================
-- Migration: Adicionar coluna image_count
-- Data: 2026-07-09
-- ========================================

-- 1. Adicionar coluna image_count
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS image_count INTEGER NOT NULL DEFAULT 0;

-- 2. Popular valores iniciais (backfill) usando jsonb_array_length
UPDATE properties 
SET image_count = CASE 
  WHEN images IS NULL OR jsonb_typeof(images) != 'array' THEN 0
  ELSE jsonb_array_length(images)
END;

-- 3. Criar função para atualizar image_count automaticamente
CREATE OR REPLACE FUNCTION update_property_image_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contador quando images mudar
  NEW.image_count := CASE 
    WHEN NEW.images IS NULL OR jsonb_typeof(NEW.images) != 'array' THEN 0
    ELSE jsonb_array_length(NEW.images)
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para executar a função antes de INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_update_image_count ON properties;

CREATE TRIGGER trigger_update_image_count
  BEFORE INSERT OR UPDATE OF images
  ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_property_image_count();

-- 5. Criar índice para otimizar queries que filtram por image_count
CREATE INDEX IF NOT EXISTS idx_properties_image_count ON properties(image_count);

-- 6. Adicionar comentário descritivo
COMMENT ON COLUMN properties.image_count IS 'Contador automático de imagens - atualizado via trigger quando images JSONB mudar';