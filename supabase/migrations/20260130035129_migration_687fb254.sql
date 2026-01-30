-- Corrigir políticas RLS da tabela properties para permitir DELETE
DROP POLICY IF EXISTS "Allow all operations" ON properties;
DROP POLICY IF EXISTS "Allow authenticated select" ON properties;
DROP POLICY IF EXISTS "Allow authenticated insert" ON properties;
DROP POLICY IF EXISTS "Allow authenticated update" ON properties;
DROP POLICY IF EXISTS "Allow authenticated delete" ON properties;

-- Criar política permissiva única
CREATE POLICY "Enable all access for authenticated users" 
  ON properties FOR ALL 
  USING (true) 
  WITH CHECK (true);