-- Verificar e corrigir DEFINITIVAMENTE as políticas RLS de broker_fee_exemptions
-- Dropar TODAS as políticas existentes
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "Allow authenticated users" ON broker_fee_exemptions;

-- Criar política SUPER SIMPLES e permissiva
CREATE POLICY "allow_all_authenticated" 
  ON broker_fee_exemptions 
  FOR ALL 
  TO authenticated
  USING (true) 
  WITH CHECK (true);