-- 1. Adicionar coluna has_partner_broker na tabela properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS has_partner_broker boolean DEFAULT false;

-- 2. Reativar RLS (é importante para segurança)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;