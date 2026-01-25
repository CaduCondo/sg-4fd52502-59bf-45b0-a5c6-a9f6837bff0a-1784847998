-- Remover políticas restritivas e adicionar políticas públicas para role_menu_permissions
DROP POLICY IF EXISTS "Anyone authenticated can view menu permissions" ON role_menu_permissions;
DROP POLICY IF EXISTS "Only authenticated can manage menu permissions" ON role_menu_permissions;

-- Criar políticas públicas para todas as operações
CREATE POLICY "Allow public read access to role_menu_permissions"
  ON role_menu_permissions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to role_menu_permissions"
  ON role_menu_permissions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to role_menu_permissions"
  ON role_menu_permissions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to role_menu_permissions"
  ON role_menu_permissions FOR DELETE
  TO public
  USING (true);