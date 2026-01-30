-- Adicionar coluna deposit_value na tabela rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposit_value NUMERIC DEFAULT 0;