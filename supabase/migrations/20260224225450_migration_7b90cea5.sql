-- ============================================
-- OTIMIZAÇÃO DE RLS POLICIES - CORRIGIDO v2
-- Usando nomes corretos das tabelas
-- ============================================

-- 1. PROPERTIES - Consolidar policies de visualização
DROP POLICY IF EXISTS "properties_select_policy" ON properties;

CREATE POLICY "properties_select_policy" ON properties
FOR SELECT
USING (
  -- Admin vê tudo
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'admin'
  )
  OR
  -- Usuário financeiro vê apenas suas localizações permitidas
  EXISTS (
    SELECT 1 FROM system_users su
    JOIN user_location_permissions ulp ON ulp.user_id = su.id
    WHERE su.id = auth.uid() 
      AND su.role = 'financeiro'
      AND ulp.location_id = properties.location_id
  )
  OR
  -- Proprietário não vê nada (ou implemente lógica específica)
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'proprietario'
  )
);

COMMENT ON POLICY "properties_select_policy" ON properties IS 
  'Policy consolidada usando índices de user_location_permissions para performance';

-- 2. RENTALS - Consolidar policies de visualização
DROP POLICY IF EXISTS "rentals_select_policy" ON rentals;

CREATE POLICY "rentals_select_policy" ON rentals
FOR SELECT
USING (
  -- Admin vê tudo
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'admin'
  )
  OR
  -- Usuário financeiro vê apenas suas localizações permitidas
  EXISTS (
    SELECT 1 FROM system_users su
    JOIN user_location_permissions ulp ON ulp.user_id = su.id
    JOIN properties p ON p.location_id = ulp.location_id
    WHERE su.id = auth.uid() 
      AND su.role = 'financeiro'
      AND p.id = rentals.property_id
  )
  OR
  -- Proprietário não vê nada (ou implemente lógica específica)
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'proprietario'
  )
);

COMMENT ON POLICY "rentals_select_policy" ON rentals IS 
  'Policy consolidada para reduzir overhead computacional em JOINs';

-- 3. PAYMENTS - Consolidar policies de visualização
DROP POLICY IF EXISTS "payments_select_policy" ON payments;

CREATE POLICY "payments_select_policy" ON payments
FOR SELECT
USING (
  -- Admin vê tudo
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'admin'
  )
  OR
  -- Usuário financeiro vê apenas suas localizações permitidas
  EXISTS (
    SELECT 1 FROM system_users su
    JOIN user_location_permissions ulp ON ulp.user_id = su.id
    JOIN properties p ON p.location_id = ulp.location_id
    JOIN rentals r ON r.property_id = p.id
    WHERE su.id = auth.uid() 
      AND su.role = 'financeiro'
      AND r.id = payments.rental_id
  )
  OR
  -- Proprietário não vê nada (ou implemente lógica específica)
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'proprietario'
  )
);

COMMENT ON POLICY "payments_select_policy" ON payments IS 
  'Policy consolidada - beneficia dos índices criados em rentals e properties';

-- 4. TENANTS - Simplificar policy
DROP POLICY IF EXISTS "tenants_select_policy" ON tenants;

CREATE POLICY "tenants_select_policy" ON tenants
FOR SELECT
USING (
  -- Admin vê tudo
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'admin'
  )
  OR
  -- Financeiro e Proprietário veem todos os inquilinos
  -- (já que inquilinos não são filtrados por localização diretamente)
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role IN ('financeiro', 'proprietario')
  )
);

COMMENT ON POLICY "tenants_select_policy" ON tenants IS 
  'Policy simplificada - inquilinos não dependem de localização diretamente';

-- 5. SYSTEM_USERS - Manter simple
DROP POLICY IF EXISTS "system_users_select_policy" ON system_users;

CREATE POLICY "system_users_select_policy" ON system_users
FOR SELECT
USING (
  -- Usuário vê apenas seu próprio registro OU é admin
  id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM system_users su
    WHERE su.id = auth.uid() AND su.role = 'admin'
  )
);

COMMENT ON POLICY "system_users_select_policy" ON system_users IS 
  'Policy simples - usuário vê apenas seu próprio registro ou admin vê tudo';