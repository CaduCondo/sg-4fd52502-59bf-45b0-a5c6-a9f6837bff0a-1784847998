-- Recriar política INSERT sem nenhuma restrição (apenas autenticado)
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;

CREATE POLICY payment_methods_insert ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);