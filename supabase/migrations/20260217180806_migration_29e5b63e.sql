-- Step 1: DROP todas as políticas existentes para limpar
DROP POLICY IF EXISTS "Allow authenticated delete" ON locations;
DROP POLICY IF EXISTS "Allow authenticated insert" ON locations;
DROP POLICY IF EXISTS "Allow authenticated select" ON locations;
DROP POLICY IF EXISTS "Allow authenticated update" ON locations;
DROP POLICY IF EXISTS "Authenticated users can delete locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON locations;
DROP POLICY IF EXISTS "Public can view locations" ON locations;
DROP POLICY IF EXISTS "Users can insert locations" ON locations;
DROP POLICY IF EXISTS "Users can update locations" ON locations;
DROP POLICY IF EXISTS "Users can view locations" ON locations;