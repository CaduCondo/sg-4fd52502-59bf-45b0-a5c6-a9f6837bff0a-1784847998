-- Criar tabela rental_terminations
CREATE TABLE rental_terminations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  termination_date DATE NOT NULL,
  payment_breakdown JSONB DEFAULT '[]'::jsonb,
  final_balance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_rental_terminations_rental_id ON rental_terminations(rental_id);
CREATE INDEX idx_rental_terminations_payment_id ON rental_terminations(payment_id);
CREATE INDEX idx_rental_terminations_termination_date ON rental_terminations(termination_date);

-- Habilitar RLS
ALTER TABLE rental_terminations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (ajuste conforme necessário)
CREATE POLICY "Users can view rental terminations" 
  ON rental_terminations FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert rental terminations" 
  ON rental_terminations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update rental terminations" 
  ON rental_terminations FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete rental terminations" 
  ON rental_terminations FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Comentários para documentação
COMMENT ON TABLE rental_terminations IS 'Stores rental termination information including payment breakdown and final balance';
COMMENT ON COLUMN rental_terminations.payment_breakdown IS 'JSON array containing breakdown of final payment (credits, debits, discounts)';
COMMENT ON COLUMN rental_terminations.final_balance IS 'Final balance after all calculations (positive = tenant owes, negative = landlord owes)';