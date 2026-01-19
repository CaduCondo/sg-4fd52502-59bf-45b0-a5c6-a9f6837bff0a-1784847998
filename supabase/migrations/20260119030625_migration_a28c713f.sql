-- ============================================================
-- FIX RLS POLICIES FOR user_location_permissions TABLE
-- ============================================================
-- Problem: INSERT/UPDATE operations are blocked by RLS policies
-- because uid() returns NULL (not using Supabase Auth)
-- Solution: Update policies to allow public write access
-- ============================================================

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow read for authenticated users" ON user_location_permissions;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_location_permissions;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON user_location_permissions;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON user_location_permissions;

-- 2. Create new permissive policies

-- SELECT: Allow public read access
CREATE POLICY "Allow public read access" 
ON user_location_permissions FOR SELECT 
USING (true);

-- INSERT: Allow public insert
CREATE POLICY "Allow public insert" 
ON user_location_permissions FOR INSERT 
WITH CHECK (true);

-- UPDATE: Allow public update
CREATE POLICY "Allow public update" 
ON user_location_permissions FOR UPDATE 
USING (true)
WITH CHECK (true);

-- DELETE: Allow public delete
CREATE POLICY "Allow public delete" 
ON user_location_permissions FOR DELETE 
USING (true);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Verify policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_location_permissions'
ORDER BY policyname;