-- Reforço FINAL de RLS para todas as tabelas críticas
-- Garantir que usuários autenticados possam fazer TUDO
DROP POLICY IF EXISTS "allow_all_authenticated" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON broker_fee_exemptions;
CREATE POLICY "allow_all_authenticated_broker" ON broker_fee_exemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_authenticated" ON rentals;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON rentals;
CREATE POLICY "allow_all_authenticated_rentals" ON rentals FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_authenticated" ON properties;
CREATE POLICY "allow_all_authenticated_properties" ON properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_authenticated" ON location_expenses;
CREATE POLICY "allow_all_authenticated_expenses" ON location_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);