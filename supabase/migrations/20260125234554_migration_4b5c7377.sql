-- Adicionar colunas payment_date e pix_code na tabela deposit_installments
ALTER TABLE deposit_installments
ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE deposit_installments
ADD COLUMN IF NOT EXISTS pix_code TEXT;

-- Comentários para documentação
COMMENT ON COLUMN deposit_installments.payment_date IS 'Data de pagamento da parcela do caução';
COMMENT ON COLUMN deposit_installments.pix_code IS 'Código PIX utilizado no pagamento da parcela';