-- Atualizar políticas RLS de configs para usar mapeamento
-- Configs: SELECT
DROP POLICY IF EXISTS "Usuários com permissão podem ver configurações" ON configs;
CREATE POLICY "Usuários com permissão podem ver configurações" ON configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id = get_system_user_id()
      AND rp.resource = 'settings'
      AND rp.can_view = true
    )
  );

-- Configs: UPDATE
DROP POLICY IF EXISTS "Usuários com permissão podem atualizar configurações" ON configs;
CREATE POLICY "Usuários com permissão podem atualizar configurações" ON configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id = get_system_user_id()
      AND rp.resource = 'settings'
      AND rp.can_edit = true
    )
  );