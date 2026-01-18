-- PARTE 3: RENTALS - Substituir política genérica por políticas específicas
-- Remover política antiga
DROP POLICY IF EXISTS "Public Access" ON rentals;

-- Criar políticas específicas
CREATE POLICY "Authenticated users can view rentals"
ON rentals
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create rentals"
ON rentals
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rentals"
ON rentals
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete rentals"
ON rentals
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);