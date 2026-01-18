-- Criar tabela de permissões de menu por perfil
CREATE TABLE IF NOT EXISTS role_menu_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'broker', 'financial')),
  menu_item TEXT NOT NULL CHECK (menu_item IN ('dashboard', 'properties', 'tenants', 'rentals', 'payments', 'financial', 'settings')),
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, menu_item)
);

-- Habilitar RLS
ALTER TABLE role_menu_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (apenas autenticados podem ver e admins podem editar)
CREATE POLICY "Anyone authenticated can view menu permissions" 
ON role_menu_permissions FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated can manage menu permissions" 
ON role_menu_permissions FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Inserir permissões padrão
INSERT INTO role_menu_permissions (role, menu_item, can_access) VALUES
-- Admin tem acesso a tudo
('admin', 'dashboard', true),
('admin', 'properties', true),
('admin', 'tenants', true),
('admin', 'rentals', true),
('admin', 'payments', true),
('admin', 'financial', true),
('admin', 'settings', true),

-- Corretor tem acesso operacional
('broker', 'dashboard', true),
('broker', 'properties', true),
('broker', 'tenants', true),
('broker', 'rentals', true),
('broker', 'payments', true),
('broker', 'financial', false),
('broker', 'settings', false),

-- Financeiro tem acesso limitado
('financial', 'dashboard', true),
('financial', 'properties', false),
('financial', 'tenants', false),
('financial', 'rentals', false),
('financial', 'payments', false),
('financial', 'financial', true),
('financial', 'settings', false)
ON CONFLICT (role, menu_item) DO NOTHING;