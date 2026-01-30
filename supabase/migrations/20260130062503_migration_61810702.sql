-- Adicionar coluna status na tabela location_expenses
ALTER TABLE location_expenses ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue'));