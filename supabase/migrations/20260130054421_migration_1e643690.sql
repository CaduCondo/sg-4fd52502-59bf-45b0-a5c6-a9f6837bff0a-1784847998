-- LIMPEZA TOTAL E RECRIAÇÃO DE RLS - RENTALS
-- Dropar TODAS as políticas existentes
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated delete" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated insert" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated select" ON rentals;
DROP POLICY IF EXISTS "Allow authenticated update" ON rentals;
DROP POLICY IF EXISTS "allow_all_authenticated_rentals" ON rentals;
DROP POLICY IF EXISTS "rentals_all_access" ON rentals;

-- Criar ÚNICA política simples e funcional
CREATE POLICY "rentals_full_access" 
  ON rentals 
  FOR ALL 
  TO public
  USING (true) 
  WITH CHECK (true);