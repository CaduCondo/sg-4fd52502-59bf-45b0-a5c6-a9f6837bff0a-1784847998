-- Fase 3: Corrigir políticas RLS da tabela locations para usar role_permissions

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver locais ativos" ON locations;
DROP POLICY IF EXISTS "Admins podem criar locais" ON locations;
DROP POLICY IF EXISTS "Admins podem atualizar locais" ON locations;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar locais" ON locations;

-- Criar novas políticas baseadas em role_permissions
CREATE POLICY "Usuários com permissão podem ver locais"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id::text = auth.uid()::text
      AND rp.resource = 'locations'
      AND rp.can_view = true
    )
  );

CREATE POLICY "Usuários com permissão podem criar locais"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id::text = auth.uid()::text
      AND rp.resource = 'locations'
      AND rp.can_create = true
    )
  );

CREATE POLICY "Usuários com permissão podem editar locais"
  ON locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id::text = auth.uid()::text
      AND rp.resource = 'locations'
      AND rp.can_edit = true
    )
  );

CREATE POLICY "Usuários com permissão podem deletar locais"
  ON locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      JOIN role_permissions rp ON rp.role = su.role
      WHERE su.id::text = auth.uid()::text
      AND rp.resource = 'locations'
      AND rp.can_delete = true
    )
  );