-- Adicionar colunas faltantes na tabela configs
ALTER TABLE configs 
ADD COLUMN IF NOT EXISTS late_fee_percentage DECIMAL(5,2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS interest_rate_percentage DECIMAL(5,2) DEFAULT 1.0;

-- Atualizar registros existentes com valores padrão
UPDATE configs 
SET late_fee_percentage = 2.0, interest_rate_percentage = 1.0 
WHERE late_fee_percentage IS NULL OR interest_rate_percentage IS NULL;