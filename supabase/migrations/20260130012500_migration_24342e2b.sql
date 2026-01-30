-- Adicionar coluna management_fee_percentage na tabela configs
ALTER TABLE configs ADD COLUMN IF NOT EXISTS management_fee_percentage NUMERIC DEFAULT 0;