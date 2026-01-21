-- Corrigir RLS para user_fee_exemptions
ALTER TABLE user_fee_exemptions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to fee exemptions" ON user_fee_exemptions;

CREATE POLICY "Admin full access to fee exemptions" 
ON user_fee_exemptions FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;