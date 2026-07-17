-- Criar tabela para parcelas de caução
CREATE TABLE IF NOT EXISTS deposit_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1 AND installment_number <= 3),
  total_installments INTEGER NOT NULL CHECK (total_installments >= 1 AND total_installments <= 3),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  payment_method TEXT,
  pix_key TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_deposit_installments_rental_id ON deposit_installments(rental_id);
CREATE INDEX idx_deposit_installments_status ON deposit_installments(status);
CREATE INDEX idx_deposit_installments_due_date ON deposit_installments(due_date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_deposit_installments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deposit_installments_updated_at
  BEFORE UPDATE ON deposit_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_deposit_installments_updated_at();

-- RLS Policies
ALTER TABLE deposit_installments ENABLE ROW LEVEL SECURITY;

-- Admin e Broker veem tudo
CREATE POLICY "Admin e Broker podem ver todas as parcelas de caução"
  ON deposit_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      WHERE su.user_id = auth.uid()
      AND su.role IN ('admin', 'broker')
    )
  );

-- Usuários financeiros veem apenas de suas localizações permitidas
CREATE POLICY "Financeiro pode ver parcelas de suas localizações"
  ON deposit_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      WHERE su.user_id = auth.uid()
      AND su.role = 'financial'
    )
    AND
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN properties p ON p.id = r.property_id
      JOIN user_location_permissions ulp ON ulp.location_id = p.location_id
      WHERE r.id = deposit_installments.rental_id
      AND ulp.user_id = auth.uid()
    )
  );

-- Admin e Broker podem inserir
CREATE POLICY "Admin e Broker podem inserir parcelas de caução"
  ON deposit_installments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users su
      WHERE su.user_id = auth.uid()
      AND su.role IN ('admin', 'broker')
    )
  );

-- Admin, Broker e Financeiro podem atualizar
CREATE POLICY "Admin, Broker e Financeiro podem atualizar parcelas"
  ON deposit_installments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      WHERE su.user_id = auth.uid()
      AND su.role IN ('admin', 'broker', 'financial')
    )
  );

-- Admin e Broker podem deletar
CREATE POLICY "Admin e Broker podem deletar parcelas de caução"
  ON deposit_installments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users su
      WHERE su.user_id = auth.uid()
      AND su.role IN ('admin', 'broker')
    )
  );

-- Comentários para documentação
COMMENT ON TABLE deposit_installments IS 'Tabela para gerenciar parcelas de caução (1x, 2x ou 3x)';
COMMENT ON COLUMN deposit_installments.installment_number IS 'Número da parcela (1, 2 ou 3)';
COMMENT ON COLUMN deposit_installments.total_installments IS 'Total de parcelas (1, 2 ou 3)';
COMMENT ON COLUMN deposit_installments.amount IS 'Valor da parcela';
COMMENT ON COLUMN deposit_installments.due_date IS 'Data de vencimento da parcela';
COMMENT ON COLUMN deposit_installments.payment_date IS 'Data do pagamento realizado';
COMMENT ON COLUMN deposit_installments.paid_amount IS 'Valor pago';
COMMENT ON COLUMN deposit_installments.status IS 'Status: pending, paid, partial, overdue';
COMMENT ON COLUMN deposit_installments.attachments IS 'Array de anexos (comprovantes, etc)';