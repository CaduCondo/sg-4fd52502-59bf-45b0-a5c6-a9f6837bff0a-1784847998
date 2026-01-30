-- Verificar e recriar políticas RLS para properties (delete existente primeiro)
DO $$ 
BEGIN
  -- Drop todas as políticas existentes
  DROP POLICY IF EXISTS "Allow authenticated select" ON properties;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON properties;
  DROP POLICY IF EXISTS "Allow authenticated update" ON properties;
  DROP POLICY IF EXISTS "Allow authenticated delete" ON properties;
  DROP POLICY IF EXISTS "Allow all operations" ON properties;
  
  -- Criar novas políticas
  CREATE POLICY "Allow authenticated select" ON properties FOR SELECT 
    USING (auth.role() = 'authenticated');
  CREATE POLICY "Allow authenticated insert" ON properties FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "Allow authenticated update" ON properties FOR UPDATE 
    USING (auth.role() = 'authenticated');
  CREATE POLICY "Allow authenticated delete" ON properties FOR DELETE 
    USING (auth.role() = 'authenticated');
END $$;