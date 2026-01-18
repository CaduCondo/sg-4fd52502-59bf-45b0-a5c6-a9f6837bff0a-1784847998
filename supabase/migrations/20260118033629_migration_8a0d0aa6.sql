-- Atualizar políticas RLS para usar a função de mapeamento
-- Locations: SELECT
DROP POLICY IF EXISTS "Usuários com permissão podem ver locais" ON locations;
CREATE POLICY "Usuários com permissão podem ver locais" ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id = get_system_user_id()
      AND rp.resource = 'locations'
      AND rp.can_view = true
    )
  );

-- Locations: INSERT
DROP POLICY IF EXISTS "Usuários com permissão podem criar locais" ON locations;
CREATE POLICY "Usuários com permissão podem criar locais" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id = get_system_user_id()
      AND rp.resource = 'locations'
      AND rp.can_create = true
    )
  );

-- Locations: UPDATE
DROP POLICY IF EXISTS "Usuários com permissão podem editar locais" ON locations;
CREATE POLICY "Usuários com permissão podem editar locais" ON locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id = get_system_user_id()
      AND rp.resource = 'locations'
      AND rp.can_edit = true
    )
  );

-- Locations: DELETE
DROP POLICY IF EXISTS "Usuários com permissão podem deletar locais" ON locations;
CREATE POLICY "Usuários com permissão podem deletar locais" ON locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id = get_system_user_id()
      AND rp.resource = 'locations'
      AND rp.can_delete = true
    )
  );