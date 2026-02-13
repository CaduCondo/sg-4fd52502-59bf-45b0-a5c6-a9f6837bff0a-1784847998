-- Adicionar coluna payment_time na tabela payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_time TEXT;

COMMENT ON COLUMN payments.payment_time IS 'Horário do recebimento no formato HH:MM';