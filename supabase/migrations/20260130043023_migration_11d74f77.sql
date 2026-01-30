-- Corrigir RLS de broker_fee_exemptions - remover políticas complexas e criar simples
-- Dropar todas as políticas existentes
DROP POLICY IF EXISTS "broker_fee_delete" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "broker_fee_insert" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "broker_fee_select" ON broker_fee_exemptions;
DROP POLICY IF EXISTS "broker_fee_update" ON broker_fee_exemptions;

-- Criar política simples e permissiva para usuários autenticados
CREATE POLICY "Enable all for authenticated" ON broker_fee_exemptions 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');