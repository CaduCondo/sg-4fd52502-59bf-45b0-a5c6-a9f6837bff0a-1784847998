-- ============================================================
-- DESABILITAR RLS EM TODAS AS TABELAS (CORRIGIDO)
-- ============================================================

ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_permissions DISABLE ROW LEVEL SECURITY;
-- location_permissions removido pois não existe