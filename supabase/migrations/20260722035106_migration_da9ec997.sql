-- Corrigir políticas RLS com sintaxe correta do Supabase (auth.uid() em vez de uid())
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;

-- Criar políticas simplificadas para qualquer usuário autenticado
CREATE POLICY "payment_methods_select" ON payment_methods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payment_methods_insert" ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "payment_methods_update" ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "payment_methods_delete" ON payment_methods
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);