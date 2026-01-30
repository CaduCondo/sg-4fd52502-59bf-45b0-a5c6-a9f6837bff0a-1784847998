-- Adicionar coluna rent_due_day na tabela rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rent_due_day INTEGER DEFAULT 5;