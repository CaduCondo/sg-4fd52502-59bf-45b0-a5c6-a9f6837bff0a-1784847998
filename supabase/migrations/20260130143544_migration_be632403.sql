-- Adicionar colunas month e year que estão faltando
ALTER TABLE location_expenses
ADD COLUMN IF NOT EXISTS month INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_location_expenses_month_year 
ON location_expenses(month, year);