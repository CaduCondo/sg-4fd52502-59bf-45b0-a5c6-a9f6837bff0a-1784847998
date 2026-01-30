-- Limpeza e correção GERAL de RLS
-- 1. broker_fee_exemptions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow select" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow insert" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow update" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow delete" ON broker_fee_exemptions;

CREATE POLICY "broker_fee_select" ON broker_fee_exemptions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "broker_fee_insert" ON broker_fee_exemptions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "broker_fee_update" ON broker_fee_exemptions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "broker_fee_delete" ON broker_fee_exemptions FOR DELETE USING (auth.role() = 'authenticated');

-- 2. role_menu_permissions
DROP POLICY IF EXISTS "Allow all" ON role_menu_permissions;
CREATE POLICY "role_menu_select" ON role_menu_permissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "role_menu_insert" ON role_menu_permissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "role_menu_update" ON role_menu_permissions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "role_menu_delete" ON role_menu_permissions FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Habilitar RLS em deposit_installments (estava desabilitado)
ALTER TABLE deposit_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposit_inst_all" ON deposit_installments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. Limpar duplicatas em rentals
DROP POLICY IF EXISTS "Allow authenticated delete rentals" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated insert rentals" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated update rentals" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated access to rentals" ON rentals;
-- Manter apenas as políticas genéricas "Allow authenticated..." se já existirem e funcionarem bem

-- 5. Limpar duplicatas em payments
DROP POLICY IF EXISTS "Allow authenticated delete payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated update payments" ON payments;