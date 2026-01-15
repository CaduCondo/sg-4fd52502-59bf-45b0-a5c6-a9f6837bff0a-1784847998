-- Remover a constraint antiga
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS tenants_status_check;

-- Criar nova constraint incluindo 'rented'
ALTER TABLE tenants 
ADD CONSTRAINT tenants_status_check 
CHECK (status IN ('active', 'inactive', 'rented'));