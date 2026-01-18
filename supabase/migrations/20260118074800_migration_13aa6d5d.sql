-- PARTE 1: PAYMENTS - Substituir política genérica por políticas específicas
-- Remover política antiga
DROP POLICY IF EXISTS "Public Access" ON payments;

-- Criar políticas específicas
CREATE POLICY "Authenticated users can view payments"
ON payments
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create payments"
ON payments
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update payments"
ON payments
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete payments"
ON payments
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);