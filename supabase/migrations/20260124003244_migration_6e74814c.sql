-- Adicionar colunas para parcelamento do caução na tabela rentals
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS deposit_installments integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS deposit_installment_1 numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_installment_2 numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_installment_3 numeric(10,2) DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN rentals.deposit_installments IS 'Quantidade de parcelas do caução (1, 2 ou 3)';
COMMENT ON COLUMN rentals.deposit_installment_1 IS 'Valor da primeira parcela do caução';
COMMENT ON COLUMN rentals.deposit_installment_2 IS 'Valor da segunda parcela do caução';
COMMENT ON COLUMN rentals.deposit_installment_3 IS 'Valor da terceira parcela do caução';