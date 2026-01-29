-- 2. DROPAR as políticas antigas que são muito permissivas
DROP POLICY IF EXISTS "Allow authenticated access to properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated delete properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated insert properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated update properties" ON properties;

DROP POLICY IF EXISTS "Allow authenticated access to locations" ON locations;
DROP POLICY IF EXISTS "Allow authenticated delete locations" ON locations;
DROP POLICY IF EXISTS "Allow authenticated insert locations" ON locations;
DROP POLICY IF EXISTS "Allow authenticated update locations" ON locations;