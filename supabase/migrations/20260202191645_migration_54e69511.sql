-- Desabilitar RLS completamente para admin_fee_exempt_locations
-- Esta tabela apenas lista locais isentos, não precisa de RLS
ALTER TABLE admin_fee_exempt_locations DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas (não são mais necessárias)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Allow admin and financial users to manage exemptions" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Enable read access for all users" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Allow all for authenticated" ON admin_fee_exempt_locations;