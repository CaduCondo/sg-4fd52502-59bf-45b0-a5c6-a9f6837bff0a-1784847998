-- Corrigir políticas RLS seguindo recomendações do Supabase
-- Remover políticas permissivas "USING (true)" e implementar controle adequado

-- 1. PROPERTIES: Apenas usuários autenticados podem gerenciar
DROP POLICY IF EXISTS "Allow public select" ON properties;
DROP POLICY IF EXISTS "Allow public insert" ON properties;
DROP POLICY IF EXISTS "Allow public update" ON properties;
DROP POLICY IF EXISTS "Allow public delete" ON properties;

CREATE POLICY "Allow authenticated select" ON properties FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON properties FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON properties FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON properties FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 2. TENANTS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON tenants;

CREATE POLICY "Allow authenticated select" ON tenants FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON tenants FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON tenants FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON tenants FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 3. RENTALS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON rentals;

CREATE POLICY "Allow authenticated select" ON rentals FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON rentals FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON rentals FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON rentals FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 4. PAYMENTS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON payments;

CREATE POLICY "Allow authenticated select" ON payments FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON payments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON payments FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON payments FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 5. SYSTEM_USERS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON system_users;

CREATE POLICY "Allow authenticated select" ON system_users FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON system_users FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON system_users FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON system_users FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 6. LOCATIONS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON locations;

CREATE POLICY "Allow authenticated select" ON locations FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON locations FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON locations FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON locations FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 7. CONFIGS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON configs;

CREATE POLICY "Allow authenticated select" ON configs FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON configs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON configs FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON configs FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 8. LOCATION_EXPENSES: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON location_expenses;

CREATE POLICY "Allow authenticated select" ON location_expenses FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON location_expenses FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON location_expenses FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON location_expenses FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 9. BROKER_FEE_EXEMPTIONS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON broker_fee_exemptions;

CREATE POLICY "Allow authenticated select" ON broker_fee_exemptions FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON broker_fee_exemptions FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON broker_fee_exemptions FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON broker_fee_exemptions FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 10. USER_LOCATION_PERMISSIONS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON user_location_permissions;

CREATE POLICY "Allow authenticated select" ON user_location_permissions FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON user_location_permissions FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON user_location_permissions FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON user_location_permissions FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 11. ROLE_MENU_PERMISSIONS: Apenas usuários autenticados
DROP POLICY IF EXISTS "Allow all operations" ON role_menu_permissions;

CREATE POLICY "Allow authenticated select" ON role_menu_permissions FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON role_menu_permissions FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON role_menu_permissions FOR UPDATE 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON role_menu_permissions FOR DELETE 
  USING (auth.role() = 'authenticated');