-- Remover políticas antigas e criar novas mais permissivas para payments
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to select payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated access to payments" ON payments;

-- Criar novas políticas que permitem acesso público
CREATE POLICY "Allow public insert to payments"
  ON payments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public select to payments"
  ON payments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public update to payments"
  ON payments
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to payments"
  ON payments
  FOR DELETE
  TO public
  USING (true);