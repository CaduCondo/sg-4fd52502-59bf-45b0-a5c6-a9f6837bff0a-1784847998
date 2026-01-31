-- Garantir permissões públicas na tabela properties para evitar erro Failed to fetch
DROP POLICY IF EXISTS "Allow public select to properties" ON properties;
CREATE POLICY "Allow public select to properties" ON properties FOR SELECT TO public USING (true);