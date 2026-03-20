-- Criar coluna pix_code na tabela payments se não existir
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS pix_code TEXT;