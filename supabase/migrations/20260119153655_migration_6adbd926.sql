-- Add missing columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS complement text,
ADD COLUMN IF NOT EXISTS rooms integer,
ADD COLUMN IF NOT EXISTS bathrooms integer,
ADD COLUMN IF NOT EXISTS area numeric(10,2),
ADD COLUMN IF NOT EXISTS has_garage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS garage_value numeric(10,2),
ADD COLUMN IF NOT EXISTS value numeric(10,2);

-- Update value column to be sum of monthly_rent + garage_value where applicable
UPDATE properties 
SET value = monthly_rent + COALESCE(garage_value, 0)
WHERE value IS NULL;