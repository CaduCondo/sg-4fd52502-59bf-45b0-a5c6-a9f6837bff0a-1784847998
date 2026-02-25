-- ETAPA 3: LIMPEZA DE COLUNAS LEGADAS
-- Remover colunas não utilizadas de rentals e location_expenses

-- 3.1. Remover 9 colunas de caução legadas de rentals
-- Sistema migrou para tabela deposit_installments
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_1;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_2;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_3;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_payment_date;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_pix_code;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_2_payment_date;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_2_pix_code;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_3_payment_date;
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit_installment_3_pix_code;

-- 3.2. Consolidar colunas de valor em rentals
-- Manter apenas rent_value (mais descritivo)
-- Primeiro, garantir que rent_value tem os dados corretos
UPDATE rentals 
SET rent_value = COALESCE(rent_value, value, monthly_rent)
WHERE rent_value IS NULL;

-- Remover colunas duplicadas
ALTER TABLE rentals DROP COLUMN IF EXISTS value;
ALTER TABLE rentals DROP COLUMN IF EXISTS monthly_rent;

-- 3.3. Consolidar colunas de dia de pagamento
-- Manter apenas rent_due_day
UPDATE rentals 
SET rent_due_day = COALESCE(rent_due_day, payment_day)
WHERE rent_due_day IS NULL;

ALTER TABLE rentals DROP COLUMN IF EXISTS payment_day;

-- 3.4. Remover coluna deposit (tipo TEXT incorreto)
-- Sistema já usa deposit_value (numeric) e deposit_installments
ALTER TABLE rentals DROP COLUMN IF EXISTS deposit;

-- 3.5. Remover duplicatas de location_expenses
-- Manter apenas reference_month e reference_year
UPDATE location_expenses 
SET reference_month = COALESCE(reference_month, month)
WHERE reference_month IS NULL;

UPDATE location_expenses 
SET reference_year = COALESCE(reference_year, year)
WHERE reference_year IS NULL;

ALTER TABLE location_expenses DROP COLUMN IF EXISTS month;
ALTER TABLE location_expenses DROP COLUMN IF EXISTS year;

-- Confirmar limpeza
SELECT 'Etapa 3 concluída: 14 colunas legadas removidas!' as message;