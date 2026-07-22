-- Recriar políticas RLS simples e funcionais (padrão do sistema)
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;

-- SELECT - qualquer usuário autenticado
CREATE POLICY payment_methods_select ON payment_methods
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT - qualquer usuário autenticado  
CREATE POLICY payment_methods_insert ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE - qualquer usuário autenticado
CREATE POLICY payment_methods_update ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE - qualquer usuário autenticado
CREATE POLICY payment_methods_delete ON payment_methods
  FOR DELETE
  TO authenticated
  USING (true);