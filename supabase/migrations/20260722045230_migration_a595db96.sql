-- Remover TODAS as políticas restantes (qualquer que seja o nome)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'payment_methods'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON payment_methods';
  END LOOP;
END $$;

-- Garantir que RLS está desabilitado
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;