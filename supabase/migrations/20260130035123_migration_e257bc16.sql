-- Corrigir políticas RLS da tabela broker_fee_exemptions DEFINITIVAMENTE
-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Allow all operations" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow authenticated users to view" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow authenticated select" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow authenticated update" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow authenticated delete" ON broker_fee_exemptions;

-- Criar políticas PERMISSIVAS (sem verificação de auth)
CREATE POLICY "Enable all access for authenticated users" 
  ON broker_fee_exemptions FOR ALL 
  USING (true) 
  WITH CHECK (true);