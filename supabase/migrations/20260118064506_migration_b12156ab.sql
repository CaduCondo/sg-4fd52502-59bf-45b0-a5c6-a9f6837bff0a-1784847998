-- Corrigir políticas RLS da tabela auth_user_mapping
DROP POLICY IF EXISTS "Users can view their own auth mapping" ON auth_user_mapping;
DROP POLICY IF EXISTS "Users can insert their own auth mapping" ON auth_user_mapping;

-- Criar políticas corretas (sem restrição de user_id pois a tabela vincula auth com system_users)
CREATE POLICY "Anyone authenticated can view auth mappings" 
ON auth_user_mapping FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert auth mappings" 
ON auth_user_mapping FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can update auth mappings" 
ON auth_user_mapping FOR UPDATE 
USING (auth.uid() IS NOT NULL);