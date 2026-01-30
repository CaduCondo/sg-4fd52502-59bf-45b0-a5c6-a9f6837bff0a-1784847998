-- Adicionar coluna status na tabela rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';