-- Criar políticas RLS para tabela configs
-- Permitir que usuários autenticados visualizem as configurações
CREATE POLICY "Anyone authenticated can view configs"
ON configs
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados criem configurações (primeira vez)
CREATE POLICY "Anyone authenticated can insert configs"
ON configs
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados atualizem configurações
CREATE POLICY "Anyone authenticated can update configs"
ON configs
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados deletem configurações (raramente usado)
CREATE POLICY "Anyone authenticated can delete configs"
ON configs
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);