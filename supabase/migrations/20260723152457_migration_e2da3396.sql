-- Adicionar campo para armazenar o valor devolvido do caução na tabela rentals
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS returned_deposit_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN rentals.returned_deposit_amount IS 'Valor do caução devolvido ao inquilino após rescisão (corrigido pela Taxa da Poupança)';