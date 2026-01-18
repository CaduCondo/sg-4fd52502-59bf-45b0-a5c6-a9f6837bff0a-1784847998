-- Criar políticas RLS para tabela locations
-- Permitir que usuários autenticados façam operações CRUD

-- 1. SELECT - Visualizar locais
CREATE POLICY "Authenticated users can view locations"
ON locations
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- 2. INSERT - Criar novos locais
CREATE POLICY "Authenticated users can create locations"
ON locations
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. UPDATE - Atualizar locais
CREATE POLICY "Authenticated users can update locations"
ON locations
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. DELETE - Deletar locais (soft delete: marcar como inativo)
CREATE POLICY "Authenticated users can delete locations"
ON locations
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);