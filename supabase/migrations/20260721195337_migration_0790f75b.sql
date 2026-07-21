-- Remover constraint única de telefone na tabela tenants
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_phone_key;