-- Fase 1: Criar tabela de permissões por perfil (role-based permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'broker', 'viewer')),
  resource TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, resource)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);

-- Habilitar RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para role_permissions
CREATE POLICY "Usuários autenticados podem ver permissões"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem gerenciar permissões"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

COMMENT ON TABLE role_permissions IS 'Permissões por perfil de usuário (RBAC)';
COMMENT ON COLUMN role_permissions.role IS 'Perfil do usuário: admin, broker, viewer';
COMMENT ON COLUMN role_permissions.resource IS 'Recurso/Tela: settings, locations, properties, tenants, rentals, payments, financial';
COMMENT ON COLUMN role_permissions.can_view IS 'Pode visualizar o recurso';
COMMENT ON COLUMN role_permissions.can_create IS 'Pode criar novos registros';
COMMENT ON COLUMN role_permissions.can_edit IS 'Pode editar registros existentes';
COMMENT ON COLUMN role_permissions.can_delete IS 'Pode deletar registros';