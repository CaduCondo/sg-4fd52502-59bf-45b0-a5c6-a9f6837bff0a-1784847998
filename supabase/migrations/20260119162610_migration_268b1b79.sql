-- Remove old location text column and make location_id NOT NULL
ALTER TABLE properties 
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS monthly_rent,
  ALTER COLUMN location_id SET NOT NULL;