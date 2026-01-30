-- 1. Criar políticas de segurança (RLS) para a tabela properties
-- Permitir leitura (SELECT) para todos (público pode ver disponíveis, auth pode ver tudo)
CREATE POLICY "Public can view available properties" 
ON properties FOR SELECT 
USING (status = 'available');

CREATE POLICY "Authenticated users can view all properties" 
ON properties FOR SELECT 
TO authenticated 
USING (true);

-- Permitir inserção (INSERT) para usuários autenticados
CREATE POLICY "Authenticated users can insert properties" 
ON properties FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir atualização (UPDATE) para usuários autenticados
CREATE POLICY "Authenticated users can update properties" 
ON properties FOR UPDATE 
TO authenticated 
USING (true);

-- Permitir exclusão (DELETE) para usuários autenticados
CREATE POLICY "Authenticated users can delete properties" 
ON properties FOR DELETE 
TO authenticated 
USING (true);