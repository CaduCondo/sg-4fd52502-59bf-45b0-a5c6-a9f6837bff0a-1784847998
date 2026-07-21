-- Adicionar colunas occupation, marital_status e monthly_income na tabela tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(12, 2);

-- Criar índice para melhorar performance em queries
CREATE INDEX IF NOT EXISTS idx_tenants_occupation ON tenants(occupation);
CREATE INDEX IF NOT EXISTS idx_tenants_marital_status ON tenants(marital_status);