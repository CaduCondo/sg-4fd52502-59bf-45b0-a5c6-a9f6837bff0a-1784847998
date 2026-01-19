-- Remove address columns from properties table (they belong to locations)
ALTER TABLE properties 
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS number,
  DROP COLUMN IF EXISTS neighborhood,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS zip_code,
  DROP COLUMN IF EXISTS country;