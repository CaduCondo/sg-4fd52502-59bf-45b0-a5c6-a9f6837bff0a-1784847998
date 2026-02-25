-- SOLUÇÃO EMERGENCIAL: REMOVER POLICIES QUE CAUSAM LOOP

-- 1. PROPERTIES - Remover policy complexa, manter apenas acesso público
DROP POLICY IF EXISTS "properties_select_policy" ON properties;

-- 2. PAYMENTS - Remover policy complexa
DROP POLICY IF EXISTS "payments_select_policy" ON payments;

-- 3. RENTALS - Remover policy complexa
DROP POLICY IF EXISTS "rentals_select_policy" ON rentals;

-- 4. TENANTS - Remover policy complexa
DROP POLICY IF EXISTS "tenants_select_policy" ON tenants;

-- 5. SYSTEM_USERS - Manter apenas a policy simples que já criamos
-- (já está correta, sem loops)

-- 6. USER_FEE_EXEMPTIONS - Remover policies que referenciam system_users
DROP POLICY IF EXISTS "Allow admin all operations on fee exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "Allow all for admins" ON user_fee_exemptions;
DROP POLICY IF EXISTS "admin_delete_fee_exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "admin_insert_fee_exemptions" ON user_fee_exemptions;
DROP POLICY IF EXISTS "admin_select_fee_exemptions" ON user_fee_exemptions;

-- 7. ADMIN_FEE_EXEMPT_LOCATIONS - Remover policy que referencia system_users
DROP POLICY IF EXISTS "Admin and financial can manage exemptions" ON admin_fee_exempt_locations;

-- Criar policy simples de acesso autenticado para essas tabelas
CREATE POLICY "admin_fee_exempt_locations_auth_access" ON admin_fee_exempt_locations
FOR ALL TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "user_fee_exemptions_auth_access" ON user_fee_exemptions
FOR ALL TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

SELECT 'Policies complexas removidas - sistema deve funcionar agora!' as message;