-- PARTE 4: TENANTS - Substituir política genérica por políticas específicas
-- Remover política antiga
DROP POLICY IF EXISTS "Public Access" ON tenants;

-- Criar políticas específicas
CREATE POLICY "Authenticated users can view tenants"
ON tenants
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tenants"
ON tenants
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tenants"
ON tenants
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tenants"
ON tenants
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);