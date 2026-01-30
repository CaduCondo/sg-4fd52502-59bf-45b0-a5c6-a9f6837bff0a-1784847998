-- Adicionar coluna rent_value na tabela rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rent_value NUMERIC DEFAULT 0;