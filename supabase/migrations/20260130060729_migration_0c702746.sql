-- Adicionar coluna expense_type na tabela location_expenses
ALTER TABLE location_expenses ADD COLUMN IF NOT EXISTS expense_type TEXT NOT NULL DEFAULT 'other';

-- Adicionar constraint para validar os tipos de despesas
ALTER TABLE location_expenses DROP CONSTRAINT IF EXISTS location_expenses_expense_type_check;
ALTER TABLE location_expenses ADD CONSTRAINT location_expenses_expense_type_check 
CHECK (expense_type IN ('water', 'electricity', 'gas', 'internet', 'maintenance', 'other'));