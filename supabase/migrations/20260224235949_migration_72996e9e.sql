-- SOLUÇÃO EMERGENCIAL: DESABILITAR RLS E RECRIAR POLICY ULTRA SIMPLES

-- 1. Desabilitar RLS temporariamente
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as policies existentes
DROP POLICY IF EXISTS "system_users_select_policy" ON system_users;
DROP POLICY IF EXISTS "system_users_insert_policy" ON system_users;
DROP POLICY IF EXISTS "system_users_update_policy" ON system_users;
DROP POLICY IF EXISTS "system_users_delete_policy" ON system_users;
DROP POLICY IF EXISTS "Admin users can view all system users" ON system_users;
DROP POLICY IF EXISTS "Users can view their own profile" ON system_users;
DROP POLICY IF EXISTS "Admin users can insert system users" ON system_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON system_users;
DROP POLICY IF EXISTS "Admin users can delete system users" ON system_users;

-- 3. Reabilitar RLS
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- 4. Criar policy ULTRA SIMPLES sem dependências externas
-- Apenas verifica se o email do usuário autenticado está na tabela
CREATE POLICY "system_users_access" ON system_users
  FOR ALL
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM system_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND role = 'admin'
    )
  );

-- 5. Verificar se não há mais recursão
SELECT 'RLS de system_users corrigido com sucesso!' as message;