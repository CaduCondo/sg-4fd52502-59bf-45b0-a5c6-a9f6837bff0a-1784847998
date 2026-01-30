-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can update properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can delete properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can view all properties" ON properties;
DROP POLICY IF EXISTS "Public can view available properties" ON properties;

-- Criar novas políticas RLS mais permissivas para properties
-- SELECT: Usuários autenticados podem ver todos os imóveis
CREATE POLICY "Allow authenticated users to view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

-- SELECT: Público pode ver apenas imóveis disponíveis
CREATE POLICY "Allow public to view available properties"
  ON properties FOR SELECT
  TO public
  USING (status = 'available');

-- INSERT: Usuários autenticados podem criar imóveis
CREATE POLICY "Allow authenticated users to create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Usuários autenticados podem atualizar imóveis
CREATE POLICY "Allow authenticated users to update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Usuários autenticados podem deletar imóveis
CREATE POLICY "Allow authenticated users to delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (true);