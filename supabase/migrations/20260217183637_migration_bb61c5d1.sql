-- DROP todas as políticas existentes de system_users
DROP POLICY IF EXISTS "Allow authenticated delete" ON system_users;
DROP POLICY IF EXISTS "Allow authenticated insert" ON system_users;
DROP POLICY IF EXISTS "Allow authenticated select" ON system_users;
DROP POLICY IF EXISTS "Allow authenticated update" ON system_users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON system_users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON system_users;
DROP POLICY IF EXISTS "Authenticated users can select users" ON system_users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON system_users;
DROP POLICY IF EXISTS "Public can view users" ON system_users;
DROP POLICY IF EXISTS "Users can delete users" ON system_users;
DROP POLICY IF EXISTS "Users can insert users" ON system_users;
DROP POLICY IF EXISTS "Users can update users" ON system_users;
DROP POLICY IF EXISTS "Users can view users" ON system_users;