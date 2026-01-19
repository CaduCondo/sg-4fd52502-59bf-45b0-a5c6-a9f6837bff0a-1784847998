-- ============================================================
-- CLEAN UP RLS POLICIES FOR user_location_permissions
-- Remove old restrictive policies that use auth.uid()
-- Keep only the public access policies
-- ============================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins can manage location permissions" ON user_location_permissions;
DROP POLICY IF EXISTS "Admins gerenciam permissões" ON user_location_permissions;
DROP POLICY IF EXISTS "Admins atualizam permissões" ON user_location_permissions;
DROP POLICY IF EXISTS "Admins deletam permissões" ON user_location_permissions;
DROP POLICY IF EXISTS "Anyone authenticated can view location permissions" ON user_location_permissions;
DROP POLICY IF EXISTS "Usuários veem suas próprias permissões" ON user_location_permissions;

-- Verify remaining policies (should only have public access policies)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_location_permissions'
ORDER BY cmd, policyname;