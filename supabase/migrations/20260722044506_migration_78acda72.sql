-- DESABILITAR RLS completamente da tabela payment_methods
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DROP POLICY IF EXISTS "payment_methods_select for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_update for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete for authenticated users" ON payment_methods;