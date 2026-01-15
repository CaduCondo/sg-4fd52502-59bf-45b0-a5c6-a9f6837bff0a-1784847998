-- Add zip_code column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Add other missing columns if needed
ALTER TABLE properties ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT;