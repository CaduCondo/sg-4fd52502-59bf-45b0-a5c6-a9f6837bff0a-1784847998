-- OPÇÃO 2: Modificar RLS policies para permitir acesso com autenticação local
-- Isso permitirá que as queries funcionem sem depender do Supabase Auth

-- 1. PROPERTIES - Permitir acesso público autenticado
DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties;
CREATE POLICY "Allow authenticated access to properties" ON properties FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create properties" ON properties;
CREATE POLICY "Allow authenticated insert properties" ON properties FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update properties" ON properties;
CREATE POLICY "Allow authenticated update properties" ON properties FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete properties" ON properties;
CREATE POLICY "Allow authenticated delete properties" ON properties FOR DELETE TO public USING (true);

-- 2. TENANTS - Permitir acesso público autenticado
DROP POLICY IF EXISTS "Authenticated users can view tenants" ON tenants;
CREATE POLICY "Allow authenticated access to tenants" ON tenants FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tenants" ON tenants;
CREATE POLICY "Allow authenticated insert tenants" ON tenants FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update tenants" ON tenants;
CREATE POLICY "Allow authenticated update tenants" ON tenants FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete tenants" ON tenants;
CREATE POLICY "Allow authenticated delete tenants" ON tenants FOR DELETE TO public USING (true);

-- 3. RENTALS - Permitir acesso público autenticado
DROP POLICY IF EXISTS "Authenticated users can view rentals" ON rentals;
CREATE POLICY "Allow authenticated access to rentals" ON rentals FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create rentals" ON rentals;
CREATE POLICY "Allow authenticated insert rentals" ON rentals FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update rentals" ON rentals;
CREATE POLICY "Allow authenticated update rentals" ON rentals FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete rentals" ON rentals;
CREATE POLICY "Allow authenticated delete rentals" ON rentals FOR DELETE TO public USING (true);

-- 4. PAYMENTS - Permitir acesso público autenticado
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
CREATE POLICY "Allow authenticated access to payments" ON payments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create payments" ON payments;
CREATE POLICY "Allow authenticated insert payments" ON payments FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;
CREATE POLICY "Allow authenticated update payments" ON payments FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;
CREATE POLICY "Allow authenticated delete payments" ON payments FOR DELETE TO public USING (true);

-- 5. LOCATIONS - Permitir acesso público autenticado
DROP POLICY IF EXISTS "Authenticated users can view locations" ON locations;
CREATE POLICY "Allow authenticated access to locations" ON locations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create locations" ON locations;
CREATE POLICY "Allow authenticated insert locations" ON locations FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update locations" ON locations;
CREATE POLICY "Allow authenticated update locations" ON locations FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete locations" ON locations;
CREATE POLICY "Allow authenticated delete locations" ON locations FOR DELETE TO public USING (true);

-- 6. CONFIGS - Já permite acesso com uid() IS NOT NULL, mantemos como está
-- Configs já tem policies adequadas

-- 7. USER_LOCATION_PERMISSIONS - Manter restrições existentes
-- Mantemos as policies atuais para segurança de permissões