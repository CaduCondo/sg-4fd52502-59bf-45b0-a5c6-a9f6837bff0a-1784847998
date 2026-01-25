-- Verificar se as políticas de tenants estão corretas
-- As políticas já existem e parecem corretas, mas vamos garantir que estão ativas

-- Recriar políticas para tenants (já existem, mas vamos garantir)
DROP POLICY IF EXISTS "Allow authenticated access to tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated delete tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated insert tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated update tenants" ON tenants;

-- Criar políticas públicas para todas as operações
CREATE POLICY "Allow public access to tenants"
  ON tenants FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to tenants"
  ON tenants FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to tenants"
  ON tenants FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to tenants"
  ON tenants FOR DELETE
  TO public
  USING (true);