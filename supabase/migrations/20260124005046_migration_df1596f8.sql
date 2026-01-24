-- Adicionar coluna total_installments na tabela deposit_installments
ALTER TABLE deposit_installments 
ADD COLUMN IF NOT EXISTS total_installments INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN deposit_installments.total_installments IS 'Número total de parcelas (1, 2 ou 3)';