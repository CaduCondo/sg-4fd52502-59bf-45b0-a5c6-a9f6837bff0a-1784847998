-- LOCATIONS: Leitura pública, escrita apenas autenticados
CREATE POLICY "Public can view locations" 
ON locations FOR SELECT 
TO public
USING (true);

CREATE POLICY "Authenticated users can insert locations" 
ON locations FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations" 
ON locations FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete locations" 
ON locations FOR DELETE 
TO authenticated
USING (true);