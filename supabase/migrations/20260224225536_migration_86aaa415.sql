-- ============================================
-- FUNÇÕES AUXILIARES PARA OTIMIZAÇÃO
-- Reduzir processamento no frontend
-- ============================================

-- Função para verificar se usuário tem acesso à localização
CREATE OR REPLACE FUNCTION user_has_location_access(
  p_user_id UUID,
  p_location_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin sempre tem acesso
  IF EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = p_user_id AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verifica permissão específica usando índice
  RETURN EXISTS (
    SELECT 1 FROM user_location_permissions
    WHERE user_id = p_user_id 
    AND location_id = p_location_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para obter total de pagamentos atrasados (otimizada)
CREATE OR REPLACE FUNCTION get_overdue_payments_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Verifica se é admin
  SELECT role = 'admin' INTO v_is_admin
  FROM system_users WHERE id = p_user_id;
  
  IF v_is_admin THEN
    -- Admin vê tudo
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM payments
    WHERE status = 'overdue' AND NOT is_paid;
  ELSE
    -- Financeiro vê apenas suas localizações (usa índices)
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM payments p
    INNER JOIN rentals r ON r.id = p.rental_id
    INNER JOIN user_location_permissions ulp ON ulp.location_id = r.location_id
    WHERE p.status = 'overdue' 
    AND NOT p.is_paid
    AND ulp.user_id = p_user_id;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para obter receita esperada do mês (otimizada)
CREATE OR REPLACE FUNCTION get_expected_revenue(
  p_user_id UUID DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC := 0;
  v_is_admin BOOLEAN;
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
BEGIN
  -- Verifica se é admin
  SELECT role = 'admin' INTO v_is_admin
  FROM system_users WHERE id = p_user_id;
  
  IF v_is_admin THEN
    -- Admin vê tudo (usa índice em reference_month/year)
    SELECT COALESCE(SUM(expected_amount), 0) INTO v_total
    FROM payments
    WHERE reference_month = v_month
    AND reference_year = v_year;
  ELSE
    -- Financeiro vê apenas suas localizações
    SELECT COALESCE(SUM(p.expected_amount), 0) INTO v_total
    FROM payments p
    INNER JOIN rentals r ON r.id = p.rental_id
    INNER JOIN user_location_permissions ulp ON ulp.location_id = r.location_id
    WHERE p.reference_month = v_month
    AND p.reference_year = v_year
    AND ulp.user_id = p_user_id;
  END IF;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Índices adicionais para suportar as funções
CREATE INDEX IF NOT EXISTS idx_payments_reference_period 
  ON payments(reference_year, reference_month);

CREATE INDEX IF NOT EXISTS idx_payments_status_paid 
  ON payments(status, is_paid) 
  WHERE NOT is_paid;

-- Comentários
COMMENT ON FUNCTION user_has_location_access IS 
  'Verifica permissão de acesso à localização usando índices otimizados';

COMMENT ON FUNCTION get_overdue_payments_count IS 
  'Retorna contagem de pagamentos atrasados com permissões aplicadas';

COMMENT ON FUNCTION get_expected_revenue IS 
  'Calcula receita esperada do mês com filtros de permissão';