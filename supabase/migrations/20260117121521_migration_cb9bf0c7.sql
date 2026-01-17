ALTER TABLE properties DROP CONSTRAINT properties_status_check;

ALTER TABLE properties ADD CONSTRAINT properties_status_check 
CHECK (status IN ('available', 'occupied', 'unavailable'));