-- Criar tabela location_expenses
CREATE TABLE IF NOT EXISTS location_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_month INTEGER NOT NULL,
  reference_year INTEGER NOT NULL,
  paid BOOLEAN DEFAULT false,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE location_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public select" ON location_expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON location_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON location_expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON location_expenses FOR DELETE USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_location_expenses_location_id ON location_expenses(location_id);
CREATE INDEX IF NOT EXISTS idx_location_expenses_reference ON location_expenses(reference_year DESC, reference_month DESC);