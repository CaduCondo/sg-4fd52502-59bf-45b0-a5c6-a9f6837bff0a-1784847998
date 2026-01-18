-- PARTE 5: SYSTEM_USERS - Substituir política genérica por políticas específicas
-- Remover política antiga
DROP POLICY IF EXISTS "Public Access" ON system_users;

-- Criar políticas específicas
CREATE POLICY "Authenticated users can view system_users"
ON system_users
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create system_users"
ON system_users
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update system_users"
ON system_users
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete system_users"
ON system_users
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);