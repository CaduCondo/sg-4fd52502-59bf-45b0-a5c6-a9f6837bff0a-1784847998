-- Drop existing policies
DROP POLICY IF EXISTS "Users can view deposit installments based on location permissions" ON deposit_installments;
DROP POLICY IF EXISTS "Users can insert deposit installments based on location permissions" ON deposit_installments;
DROP POLICY IF EXISTS "Users can update deposit installments based on location permissions" ON deposit_installments;
DROP POLICY IF EXISTS "Users can delete deposit installments based on location permissions" ON deposit_installments;

-- Create correct policies with proper JOIN and auth.uid()
CREATE POLICY "Users can view deposit installments based on location permissions"
ON deposit_installments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM rentals r
      JOIN properties p ON (p.id = r.property_id)
      JOIN user_location_permissions ulp ON (ulp.location_id = p.location_id)
    WHERE r.id = deposit_installments.rental_id
      AND ulp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert deposit installments based on location permissions"
ON deposit_installments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM rentals r
      JOIN properties p ON (p.id = r.property_id)
      JOIN user_location_permissions ulp ON (ulp.location_id = p.location_id)
    WHERE r.id = deposit_installments.rental_id
      AND ulp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update deposit installments based on location permissions"
ON deposit_installments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM rentals r
      JOIN properties p ON (p.id = r.property_id)
      JOIN user_location_permissions ulp ON (ulp.location_id = p.location_id)
    WHERE r.id = deposit_installments.rental_id
      AND ulp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete deposit installments based on location permissions"
ON deposit_installments
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM rentals r
      JOIN properties p ON (p.id = r.property_id)
      JOIN user_location_permissions ulp ON (ulp.location_id = p.location_id)
    WHERE r.id = deposit_installments.rental_id
      AND ulp.user_id = auth.uid()
  )
);