-- Criar função para calcular e validar o status correto do pagamento
CREATE OR REPLACE FUNCTION calculate_correct_payment_status(
  p_expected_amount NUMERIC,
  p_paid_amount NUMERIC,
  p_discount NUMERIC,
  p_late_fee NUMERIC,
  p_interest NUMERIC,
  p_payment_date TIMESTAMP
)
RETURNS TEXT AS $$
DECLARE
  total_expected NUMERIC;
  remaining NUMERIC;
BEGIN
  -- Calcular o valor total esperado (com taxas e descontos)
  total_expected := COALESCE(p_expected_amount, 0) 
                   + COALESCE(p_late_fee, 0) 
                   + COALESCE(p_interest, 0) 
                   - COALESCE(p_discount, 0);
  
  -- Calcular o valor restante
  remaining := total_expected - COALESCE(p_paid_amount, 0);
  
  -- Determinar o status correto
  -- Se a diferença for menor que 5 centavos, considerar como pago
  IF ABS(remaining) <= 0.05 THEN
    RETURN 'paid';
  ELSIF p_payment_date IS NOT NULL AND COALESCE(p_paid_amount, 0) > 0 THEN
    RETURN 'partial';
  ELSE
    RETURN 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar trigger para validar e corrigir o status automaticamente
CREATE OR REPLACE FUNCTION validate_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  correct_status TEXT;
BEGIN
  -- Calcular o status correto
  correct_status := calculate_correct_payment_status(
    NEW.expected_amount,
    NEW.paid_amount,
    NEW.discount,
    NEW.late_fee,
    NEW.interest,
    NEW.payment_date
  );
  
  -- Forçar o status correto
  NEW.status := correct_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS validate_payment_status_trigger ON payments;

-- Criar o trigger para INSERT e UPDATE
CREATE TRIGGER validate_payment_status_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_status();