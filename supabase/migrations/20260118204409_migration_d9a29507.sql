-- ETAPA 4: Remover colunas de endereço redundantes
-- IMPORTANTE: Isso vai DELETAR as colunas permanentemente!

ALTER TABLE properties
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS number,
DROP COLUMN IF EXISTS complement,
DROP COLUMN IF EXISTS neighborhood,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS cep,
DROP COLUMN IF EXISTS zip_code;

-- Verificar estrutura final
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'properties'
ORDER BY ordinal_position;