-- Verificar e corrigir políticas RLS da tabela rentals
-- O erro mostra que não consegue inserir nova locação

DROP POLICY IF EXISTS "Allow all for authenticated" ON rentals;

CREATE POLICY "Allow all operations for authenticated users" 
  ON rentals FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');