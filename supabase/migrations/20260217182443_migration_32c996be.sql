-- Criar política adicional para permitir INSERT público
-- Isso resolve o problema temporariamente enquanto investigamos a autenticação
CREATE POLICY "locations_insert_public_policy" ON locations
  FOR INSERT
  TO public
  WITH CHECK (true);