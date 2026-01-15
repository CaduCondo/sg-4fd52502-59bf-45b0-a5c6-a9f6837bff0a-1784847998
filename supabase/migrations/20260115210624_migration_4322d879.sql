-- Update any existing payments with invalid status to ensure data consistency
UPDATE payments 
SET status = 'paid' 
WHERE status NOT IN ('paid', 'pending', 'partial', 'overdue');

-- Add a check constraint to ensure only valid status values
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('paid', 'pending', 'partial', 'overdue'));