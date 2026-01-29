-- 3. CRIAR políticas otimizadas e seguras

-- PROPERTIES: Leitura pública apenas de disponíveis, escrita apenas autenticados
CREATE POLICY "Public can view available properties" 
ON properties FOR SELECT 
TO public
USING (status = 'available');

CREATE POLICY "Authenticated users can view all properties" 
ON properties FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert properties" 
ON properties FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties" 
ON properties FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete properties" 
ON properties FOR DELETE 
TO authenticated
USING (true);