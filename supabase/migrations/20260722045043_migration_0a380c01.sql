-- GARANTIR que RLS está desabilitado E remover TODAS as políticas
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods_select for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_update for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete for authenticated users" ON payment_methods;
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;