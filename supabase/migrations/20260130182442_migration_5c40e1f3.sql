-- Corrigir RLS da tabela deposit_installments
DROP POLICY IF EXISTS "Allow public select to deposit_installments" ON deposit_installments;
DROP POLICY IF EXISTS "Allow public insert to deposit_installments" ON deposit_installments;
DROP POLICY IF EXISTS "Allow public update to deposit_installments" ON deposit_installments;
DROP POLICY IF EXISTS "Allow public delete to deposit_installments" ON deposit_installments;

CREATE POLICY "Allow public select to deposit_installments" ON deposit_installments FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert to deposit_installments" ON deposit_installments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to deposit_installments" ON deposit_installments FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete to deposit_installments" ON deposit_installments FOR DELETE TO public USING (true);