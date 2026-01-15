-- Drop existing tables to ensure clean slate with correct schema
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS rentals CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS configs CASCADE;

-- Recreate tables with correct columns

-- Create properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  type TEXT NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'occupied')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rentals table
CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  payment_day INTEGER NOT NULL,
  has_garage BOOLEAN DEFAULT FALSE,
  garage_value DECIMAL(10,2),
  value DECIMAL(10,2) NOT NULL, -- Total value (rent + garage)
  deposit TEXT,
  contract_attachments JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  reference_year TEXT NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'dinheiro')),
  payment_location TEXT,
  payment_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'partial', 'paid')),
  is_paid BOOLEAN DEFAULT FALSE,
  late_fee DECIMAL(10,2) DEFAULT 0,
  interest DECIMAL(10,2) DEFAULT 0,
  admin_fee DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  partial_payments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create configs table
CREATE TABLE configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 6.00,
  locations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO configs (admin_fee_percentage, locations)
VALUES (6.00, '["Centro", "Jd. Colombo", "Vila Nova"]'::jsonb);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public Access" ON properties FOR ALL USING (true);
CREATE POLICY "Public Access" ON tenants FOR ALL USING (true);
CREATE POLICY "Public Access" ON rentals FOR ALL USING (true);
CREATE POLICY "Public Access" ON payments FOR ALL USING (true);
CREATE POLICY "Public Access" ON configs FOR ALL USING (true);