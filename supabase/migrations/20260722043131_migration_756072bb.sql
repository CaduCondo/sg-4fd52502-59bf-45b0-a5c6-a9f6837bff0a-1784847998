-- Remover TODAS as políticas antigas de payment_methods
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;

-- Aplicar EXATAMENTE as mesmas políticas de tenants (que funciona)
CREATE POLICY "Enable read access for authenticated users" ON payment_methods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON payment_methods
  FOR DELETE
  TO authenticated
  USING (true);