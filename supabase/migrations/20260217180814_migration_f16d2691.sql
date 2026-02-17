-- Step 2: Criar políticas simples e diretas
-- SELECT: Todos podem ver (público e autenticados)
CREATE POLICY "locations_select_policy" ON locations
  FOR SELECT
  TO public
  USING (true);

-- INSERT: Apenas usuários autenticados
CREATE POLICY "locations_insert_policy" ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Apenas usuários autenticados
CREATE POLICY "locations_update_policy" ON locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Apenas usuários autenticados (CRÍTICO)
CREATE POLICY "locations_delete_policy" ON locations
  FOR DELETE
  TO authenticated
  USING (true);