-- Remover TODAS as políticas antigas da tabela admin_fee_exempt_locations
DROP POLICY IF EXISTS "Admins can manage admin fee exemptions" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Authenticated users can view admin fee exemptions" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Users can delete admin fee exemptions" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Users can insert admin fee exemptions" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Users can update admin fee exemptions" ON admin_fee_exempt_locations;
DROP POLICY IF EXISTS "Users can view admin fee exemptions" ON admin_fee_exempt_locations;

-- Criar UMA ÚNICA política simples que permite TUDO para usuários autenticados
CREATE POLICY "Allow all operations for authenticated users"
  ON admin_fee_exempt_locations
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);