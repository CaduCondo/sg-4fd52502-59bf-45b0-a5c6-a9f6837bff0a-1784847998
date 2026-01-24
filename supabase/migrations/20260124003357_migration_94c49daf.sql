-- Criar tabela para gerenciar as parcelas do caução (corrigido)
CREATE TABLE IF NOT EXISTS deposit_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1 AND installment_number <= 3),
  installment_total INTEGER NOT NULL CHECK (installment_total >= 1 AND installment_total <= 3),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  pix_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários
COMMENT ON TABLE deposit_installments IS 'Armazena as parcelas do caução de cada locação';
COMMENT ON COLUMN deposit_installments.installment_number IS 'Número da parcela (1, 2 ou 3)';
COMMENT ON COLUMN deposit_installments.installment_total IS 'Total de parcelas (1, 2 ou 3)';
COMMENT ON COLUMN deposit_installments.amount IS 'Valor da parcela';
COMMENT ON COLUMN deposit_installments.pix_code IS 'Código PIX para pagamento da parcela';

-- Habilitar RLS
ALTER TABLE deposit_installments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para deposit_installments
CREATE POLICY "Users can view deposit installments based on location permissions"
  ON deposit_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN user_location_permissions ulp ON ulp.location_id = r.property_id
      WHERE r.id = deposit_installments.rental_id
        AND ulp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deposit installments based on location permissions"
  ON deposit_installments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN user_location_permissions ulp ON ulp.location_id = r.property_id
      WHERE r.id = deposit_installments.rental_id
        AND ulp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deposit installments based on location permissions"
  ON deposit_installments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN user_location_permissions ulp ON ulp.location_id = r.property_id
      WHERE r.id = deposit_installments.rental_id
        AND ulp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deposit installments based on location permissions"
  ON deposit_installments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN user_location_permissions ulp ON ulp.location_id = r.property_id
      WHERE r.id = deposit_installments.rental_id
        AND ulp.user_id = auth.uid()
    )
  );