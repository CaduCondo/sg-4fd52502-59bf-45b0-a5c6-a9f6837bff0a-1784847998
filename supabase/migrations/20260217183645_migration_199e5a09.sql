-- Criar políticas simples e diretas para system_users
-- SELECT: Todos podem ver
CREATE POLICY "system_users_select_policy" ON system_users
  FOR SELECT
  TO public
  USING (true);

-- INSERT: Qualquer um pode criar (authenticated + anon)
CREATE POLICY "system_users_insert_policy" ON system_users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- UPDATE: Apenas authenticated pode editar
CREATE POLICY "system_users_update_policy" ON system_users
  FOR UPDATE
  TO authenticated
  USING (true);

-- DELETE: Apenas authenticated pode deletar
CREATE POLICY "system_users_delete_policy" ON system_users
  FOR DELETE
  TO authenticated
  USING (true);