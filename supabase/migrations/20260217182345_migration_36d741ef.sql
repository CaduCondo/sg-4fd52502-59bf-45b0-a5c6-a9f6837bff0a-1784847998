-- DROP a política de INSERT atual e recriar corretamente
DROP POLICY IF EXISTS "locations_insert_policy" ON locations;

-- Criar nova política de INSERT que funciona
CREATE POLICY "locations_insert_policy" ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);