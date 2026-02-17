-- Create indexes for better query performance on payments table
CREATE INDEX IF NOT EXISTS idx_payments_reference_year_month 
ON payments(reference_year DESC, reference_month DESC);

CREATE INDEX IF NOT EXISTS idx_payments_rental_id 
ON payments(rental_id);

CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_due_date 
ON payments(due_date);