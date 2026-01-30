-- Habilitar Row Level Security em TODAS as tabelas
-- Conforme recomendação crítica do Supabase
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_fee_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_expenses ENABLE ROW LEVEL SECURITY;

-- Verificar se há tabelas sem RLS habilitado
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT IN (
    SELECT tablename 
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE c.relrowsecurity = true
  );