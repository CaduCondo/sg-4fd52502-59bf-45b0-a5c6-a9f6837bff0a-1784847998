-- Adicionar coluna attachments na tabela location_expenses
ALTER TABLE location_expenses 
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

COMMENT ON COLUMN location_expenses.attachments IS 'Array de URLs de anexos (comprovantes, notas fiscais, etc)';