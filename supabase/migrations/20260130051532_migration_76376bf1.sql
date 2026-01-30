-- Verificar e corrigir políticas RLS da tabela rentals também
DROP POLICY IF EXISTS "Allow all for authenticated users" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated users" ON rentals;

-- Criar política SUPER SIMPLES e permissiva
CREATE POLICY "allow_all_authenticated" 
  ON rentals 
  FOR ALL 
  TO authenticated
  USING (true) 
  WITH CHECK (true);