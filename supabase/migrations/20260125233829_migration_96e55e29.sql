-- Adicionar novas colunas para data de pagamento e código PIX do caução
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS deposit_payment_date date,
ADD COLUMN IF NOT EXISTS deposit_pix_code text,
ADD COLUMN IF NOT EXISTS deposit_installment_2_payment_date date,
ADD COLUMN IF NOT EXISTS deposit_installment_2_pix_code text,
ADD COLUMN IF NOT EXISTS deposit_installment_3_payment_date date,
ADD COLUMN IF NOT EXISTS deposit_installment_3_pix_code text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN rentals.deposit_payment_date IS 'Data de pagamento da 1ª parcela do caução';
COMMENT ON COLUMN rentals.deposit_pix_code IS 'Código PIX da 1ª parcela do caução';
COMMENT ON COLUMN rentals.deposit_installment_2_payment_date IS 'Data de pagamento da 2ª parcela do caução';
COMMENT ON COLUMN rentals.deposit_installment_2_pix_code IS 'Código PIX da 2ª parcela do caução';
COMMENT ON COLUMN rentals.deposit_installment_3_payment_date IS 'Data de pagamento da 3ª parcela do caução';
COMMENT ON COLUMN rentals.deposit_installment_3_pix_code IS 'Código PIX da 3ª parcela do caução';