-- Add attachments column to rentals table
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN rentals.attachments IS 'Array of base64 encoded attachments (photos, PDFs, documents)';