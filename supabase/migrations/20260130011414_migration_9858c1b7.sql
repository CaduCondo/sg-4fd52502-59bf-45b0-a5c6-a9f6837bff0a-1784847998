-- Remover políticas antigas que estão causando conflito
DROP POLICY IF EXISTS "Allow authenticated users to create properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to delete properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to update properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to view all properties" ON properties;
DROP POLICY IF EXISTS "Allow public to view available properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can delete properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can update properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can view all properties" ON properties;
DROP POLICY IF EXISTS "Public can view available properties" ON properties;

-- Criar políticas simples e funcionais que permitem acesso público (mesma lógica de outras tabelas)
CREATE POLICY "Allow public read access" ON properties FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON properties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON properties FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON properties FOR DELETE USING (true);