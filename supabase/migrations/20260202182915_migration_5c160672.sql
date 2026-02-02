-- Corrigir políticas RLS da tabela admin_fee_exempt_locations
-- Permitir INSERT, UPDATE e DELETE para usuários autenticados

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "Users can view admin fee exemptions" ON admin_fee_exempt_locations;

-- 2. Criar políticas completas (CRUD)
CREATE POLICY "Users can view admin fee exemptions" ON admin_fee_exempt_locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert admin fee exemptions" ON admin_fee_exempt_locations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update admin fee exemptions" ON admin_fee_exempt_locations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete admin fee exemptions" ON admin_fee_exempt_locations
  FOR DELETE
  USING (auth.uid() IS NOT NULL);