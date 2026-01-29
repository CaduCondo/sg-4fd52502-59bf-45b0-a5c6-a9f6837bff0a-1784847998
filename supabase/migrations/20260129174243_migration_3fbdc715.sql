-- Adicionar todas as colunas faltantes na tabela deposit_installments
ALTER TABLE deposit_installments
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
ADD COLUMN IF NOT EXISTS due_date date,
ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_location text,
ADD COLUMN IF NOT EXISTS payment_code text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS reference_month integer,
ADD COLUMN IF NOT EXISTS reference_year integer,
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS attachments text[],
ADD COLUMN IF NOT EXISTS penalty_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;