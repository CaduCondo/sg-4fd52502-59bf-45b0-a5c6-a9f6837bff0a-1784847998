-- Corrigir RLS policy para locations - permitir inserção de novos locais
DROP POLICY IF EXISTS "Users can insert locations" ON locations;

CREATE POLICY "Users can insert locations" ON locations
FOR INSERT
WITH CHECK (true);

-- Garantir que a policy de SELECT também existe
DROP POLICY IF EXISTS "Users can view locations" ON locations;

CREATE POLICY "Users can view locations" ON locations
FOR SELECT
USING (true);

-- Policy para UPDATE
DROP POLICY IF EXISTS "Users can update locations" ON locations;

CREATE POLICY "Users can update locations" ON locations
FOR UPDATE
USING (true);