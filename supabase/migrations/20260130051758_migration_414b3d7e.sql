-- Garantir que a coluna deposit_value existe em rentals (reforço)
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposit_value NUMERIC DEFAULT 0;