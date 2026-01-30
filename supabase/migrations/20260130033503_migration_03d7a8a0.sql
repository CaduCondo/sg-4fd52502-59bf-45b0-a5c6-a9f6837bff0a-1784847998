-- Verificar e recriar políticas RLS para broker_fee_exemptions
DO $$ 
BEGIN
  -- Drop todas as políticas existentes
  DROP POLICY IF EXISTS "Allow authenticated select" ON broker_fee_exemptions;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON broker_fee_exemptions;
  DROP POLICY IF EXISTS "Allow authenticated update" ON broker_fee_exemptions;
  DROP POLICY IF EXISTS "Allow authenticated delete" ON broker_fee_exemptions;
  DROP POLICY IF EXISTS "Allow all operations" ON broker_fee_exemptions;
  
  -- Criar novas políticas
  CREATE POLICY "Allow authenticated select" ON broker_fee_exemptions FOR SELECT 
    USING (auth.role() = 'authenticated');
  CREATE POLICY "Allow authenticated insert" ON broker_fee_exemptions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "Allow authenticated update" ON broker_fee_exemptions FOR UPDATE 
    USING (auth.role() = 'authenticated');
  CREATE POLICY "Allow authenticated delete" ON broker_fee_exemptions FOR DELETE 
    USING (auth.role() = 'authenticated');
END $$;