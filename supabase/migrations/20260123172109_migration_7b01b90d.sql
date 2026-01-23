-- Adicionar coluna pix_code_type na tabela payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS pix_code_type TEXT;

-- Adicionar comentário descritivo
COMMENT ON COLUMN payments.pix_code_type IS 'Tipo de código PIX: CP (Crédito Pessoa), CD (Crédito Depósito), CE (Crédito Especial)';