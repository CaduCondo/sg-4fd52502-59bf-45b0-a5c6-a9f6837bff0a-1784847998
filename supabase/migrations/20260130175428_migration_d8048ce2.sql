-- Corrigir política RLS da tabela payments para permitir inserção autenticada
-- Remover política restritiva e adicionar uma mais permissiva

-- Primeiro, remover a política existente que está muito restritiva
DROP POLICY IF EXISTS "Allow authenticated insert" ON payments;

-- Criar nova política que permite inserção para usuários autenticados sem restrições adicionais
CREATE POLICY "Allow authenticated users to insert payments" 
ON payments 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Verificar se há política de SELECT também
-- Adicionar política de SELECT se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payments' 
    AND policyname = 'Allow authenticated users to select payments'
  ) THEN
    CREATE POLICY "Allow authenticated users to select payments" 
    ON payments 
    FOR SELECT 
    TO authenticated 
    USING (true);
  END IF;
END $$;