-- Drop ALL existing policies on deposit_installments
DROP POLICY IF EXISTS "Users can delete deposit installments based on location permiss" ON deposit_installments;
DROP POLICY IF EXISTS "Users can insert deposit installments based on location permiss" ON deposit_installments;
DROP POLICY IF EXISTS "Users can update deposit installments based on location permiss" ON deposit_installments;
DROP POLICY IF EXISTS "Users can view deposit installments based on location permissio" ON deposit_installments;

-- Create TEMPORARY permissive policies for testing
CREATE POLICY "Allow all authenticated users to view deposit installments"
ON deposit_installments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert deposit installments"
ON deposit_installments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update deposit installments"
ON deposit_installments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete deposit installments"
ON deposit_installments FOR DELETE
TO authenticated
USING (true);