-- Adicionar coluna broker_fee_percentage se não existir
ALTER TABLE configs ADD COLUMN IF NOT EXISTS broker_fee_percentage NUMERIC DEFAULT 0;

-- Adicionar constraint de validação
ALTER TABLE configs DROP CONSTRAINT IF EXISTS configs_fees_check;
ALTER TABLE configs ADD CONSTRAINT configs_fees_check 
  CHECK (
    broker_fee_percentage >= 0 AND broker_fee_percentage <= 100 AND
    admin_fee_percentage >= 0 AND admin_fee_percentage <= 100 AND
    management_fee_percentage >= 0 AND management_fee_percentage <= 100
  );