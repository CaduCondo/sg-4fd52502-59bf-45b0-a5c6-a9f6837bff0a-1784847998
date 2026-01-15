-- Adicionar colunas document_type e document se não existirem
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS document text;

-- Tornar CPF nullable (para suportar CNPJs)
ALTER TABLE tenants 
ALTER COLUMN cpf DROP NOT NULL;

-- Atualizar registros existentes: copiar CPF para document se document estiver vazio
UPDATE tenants 
SET document = cpf, document_type = 'cpf' 
WHERE document IS NULL AND cpf IS NOT NULL;

-- Adicionar constraint para garantir que document_type seja cpf ou cnpj
ALTER TABLE tenants 
ADD CONSTRAINT tenants_document_type_check 
CHECK (document_type IN ('cpf', 'cnpj'));