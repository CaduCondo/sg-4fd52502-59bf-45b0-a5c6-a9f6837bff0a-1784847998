-- Alterar a coluna end_date para permitir NULL (data de término é opcional)
ALTER TABLE rentals ALTER COLUMN end_date DROP NOT NULL;