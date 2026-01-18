-- PARTE 2: PROPERTIES - Substituir política genérica por políticas específicas
-- Remover política antiga
DROP POLICY IF EXISTS "Public Access" ON properties;

-- Criar políticas específicas
CREATE POLICY "Authenticated users can view properties"
ON properties
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create properties"
ON properties
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update properties"
ON properties
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete properties"
ON properties
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);