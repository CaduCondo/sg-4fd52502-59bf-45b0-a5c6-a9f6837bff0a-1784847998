-- Adicionar campos para controlar se multa e juros foram perdoados
ALTER TABLE payments 
ADD COLUMN late_fee_waived boolean DEFAULT false,
ADD COLUMN interest_waived boolean DEFAULT false;

COMMENT ON COLUMN payments.late_fee_waived IS 'Indica se a multa por atraso foi perdoada/removida (true = não cobrar multa)';
COMMENT ON COLUMN payments.interest_waived IS 'Indica se os juros por atraso foram perdoados/removidos (true = não cobrar juros)';

-- Criar índices para melhorar performance de consultas
CREATE INDEX idx_payments_late_fee_waived ON payments(late_fee_waived);
CREATE INDEX idx_payments_interest_waived ON payments(interest_waived);