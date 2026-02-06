-- Adicionar campos de endereço na tabela tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS complement text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text;

-- Comentários para documentação
COMMENT ON COLUMN tenants.zip_code IS 'CEP do inquilino';
COMMENT ON COLUMN tenants.street IS 'Rua/Logradouro';
COMMENT ON COLUMN tenants.number IS 'Número do endereço';
COMMENT ON COLUMN tenants.complement IS 'Complemento (apto, bloco, etc)';
COMMENT ON COLUMN tenants.neighborhood IS 'Bairro';
COMMENT ON COLUMN tenants.city IS 'Cidade';
COMMENT ON COLUMN tenants.state IS 'Estado (UF)';