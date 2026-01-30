-- LIMPEZA TOTAL E RECRIAÇÃO DE RLS - BROKER_FEE_EXEMPTIONS
-- Dropar TODAS as políticas existentes
DROP POLICY IF EXISTS "Enable all for authenticated" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "allow_all_authenticated_broker" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "broker_fee_exemptions_all_access" ON broker_fee_exemptions;

-- Criar ÚNICA política simples e funcional
CREATE POLICY "broker_fee_exemptions_full_access" 
  ON broker_fee_exemptions 
  FOR ALL 
  TO public
  USING (true) 
  WITH CHECK (true);