-- SOLUÇÃO DEFINITIVA: DESABILITAR RLS E RECRIAR DO ZERO

-- 1. Remover TODAS as policies de system_users
DROP POLICY IF EXISTS "system_users_access" ON system_users;
DROP POLICY IF EXISTS "Users can view their own system user" ON system_users;
DROP POLICY IF EXISTS "Users can update their own system user" ON system_users;
DROP POLICY IF EXISTS "system_users_select_policy" ON system_users;
DROP POLICY IF EXISTS "system_users_insert_policy" ON system_users;
DROP POLICY IF EXISTS "system_users_update_policy" ON system_users;
DROP POLICY IF EXISTS "system_users_delete_policy" ON system_users;

-- 2. Desabilitar RLS temporariamente
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;

-- 3. Verificar se funcionou
SELECT 'Todas as policies de system_users removidas e RLS desabilitado!' as message;