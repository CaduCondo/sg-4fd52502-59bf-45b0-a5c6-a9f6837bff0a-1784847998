-- Adicionar coluna breakdown na tabela payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS breakdown JSONB;

-- Comentário explicativo
COMMENT ON COLUMN payments.breakdown IS 'Array JSON com detalhamento da formação de valores: [{description, amount, type}]';