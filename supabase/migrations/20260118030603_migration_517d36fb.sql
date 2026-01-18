-- Fase 4: Atualizar políticas RLS da tabela configs para usar role_permissions

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações" ON configs;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar configurações" ON configs;

-- Criar novas políticas baseadas em role_permissions
CREATE POLICY "Usuários com permissão podem ver configurações"
  ON configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id::text = auth.uid()::text
      AND rp.resource = 'settings'
      AND rp.can_view = true
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar configurações"
  ON configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id::text = auth.uid()::text
      AND rp.resource = 'settings'
      AND rp.can_edit = true
    )
  );