-- Atualizar políticas de role_permissions para usar mapeamento
DROP POLICY IF EXISTS "Apenas admins podem gerenciar permissões" ON role_permissions;
CREATE POLICY "Apenas admins podem gerenciar permissões" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = get_system_user_id()
      AND role = 'admin'
    )
  );