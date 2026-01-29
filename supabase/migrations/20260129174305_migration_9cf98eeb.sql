-- Criar índices para melhorar performance nas novas colunas
CREATE INDEX IF NOT EXISTS idx_deposit_installments_status ON deposit_installments(status);
CREATE INDEX IF NOT EXISTS idx_deposit_installments_due_date ON deposit_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_deposit_installments_rental_status ON deposit_installments(rental_id, status);