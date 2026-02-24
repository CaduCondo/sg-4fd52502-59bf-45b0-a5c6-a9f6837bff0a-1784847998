-- ============================================
-- VIEWS MATERIALIZADAS COMPLETAS COM ÍNDICES
-- Criar tudo em ordem correta
-- ============================================

-- 1. VIEW: Estatísticas do Dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
  -- Contadores
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'available') as available_properties,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'rented') as rented_properties,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'maintenance') as maintenance_properties,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = true) as active_contracts,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = true AND r.end_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_contracts,
  
  -- Valores financeiros
  COALESCE(SUM(pay.expected_amount) FILTER (
    WHERE pay.status IN ('pending', 'overdue') 
    AND pay.due_date <= CURRENT_DATE
  ), 0) as overdue_amount,
  
  COALESCE(SUM(pay.expected_amount) FILTER (
    WHERE pay.due_date = CURRENT_DATE
  ), 0) as due_today_amount,
  
  COALESCE(SUM(pay.paid_amount) FILTER (
    WHERE pay.is_paid = true
    AND EXTRACT(MONTH FROM pay.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM pay.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) as paid_this_month,
  
  -- Metadata
  CURRENT_TIMESTAMP as last_updated

FROM properties p
LEFT JOIN rentals r ON r.property_id = p.id
LEFT JOIN tenants t ON t.id = r.tenant_id
LEFT JOIN payments pay ON pay.rental_id = r.id;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats_unique 
ON mv_dashboard_stats(last_updated);

-- 2. VIEW: Receitas Mensais (últimos 12 meses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_revenue AS
SELECT 
  loc.id as location_id,
  loc.name as location_name,
  DATE_TRUNC('month', pay.payment_date)::date as month_date,
  EXTRACT(YEAR FROM pay.payment_date)::int as year,
  EXTRACT(MONTH FROM pay.payment_date)::int as month,
  
  -- Valores
  COUNT(pay.id) as payment_count,
  COALESCE(SUM(pay.expected_amount), 0) as expected_amount,
  COALESCE(SUM(pay.paid_amount) FILTER (WHERE pay.is_paid = true), 0) as paid_amount,
  
  -- Metadata
  CURRENT_TIMESTAMP as last_updated

FROM payments pay
JOIN rentals r ON r.id = pay.rental_id
JOIN properties p ON p.id = r.property_id
JOIN locations loc ON loc.id = p.location_id
WHERE pay.payment_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY loc.id, loc.name, DATE_TRUNC('month', pay.payment_date)::date, 
         EXTRACT(YEAR FROM pay.payment_date), EXTRACT(MONTH FROM pay.payment_date);

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_revenue_unique 
ON mv_monthly_revenue(location_id, month_date);

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_mv_monthly_revenue_year_month 
ON mv_monthly_revenue(year, month);

-- 3. VIEW: Despesas Mensais (últimos 12 meses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_expenses AS
SELECT 
  loc.id as location_id,
  loc.name as location_name,
  make_date(le.reference_year, le.reference_month, 1) as month_date,
  le.reference_year as year,
  le.reference_month as month,
  
  -- Valores
  COUNT(le.id) as expense_count,
  COALESCE(SUM(le.amount), 0) as total_amount,
  
  -- Metadata
  CURRENT_TIMESTAMP as last_updated

FROM location_expenses le
JOIN locations loc ON loc.id = le.location_id
WHERE make_date(le.reference_year, le.reference_month, 1) >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY loc.id, loc.name, le.reference_year, le.reference_month;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_expenses_unique 
ON mv_monthly_expenses(location_id, month_date);

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_mv_monthly_expenses_year_month 
ON mv_monthly_expenses(year, month);

-- ============================================
-- FUNÇÕES DE REFRESH
-- ============================================

-- Função para refresh de todas as views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_expenses;
END;
$$;

-- ============================================
-- TRIGGERS PARA AUTO-REFRESH
-- ============================================

-- Função trigger para enfileirar refresh
CREATE OR REPLACE FUNCTION trigger_refresh_views()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Nota: Em produção, use pg_cron ou sistema de jobs
  -- Por enquanto, apenas notifica que houve mudança
  NOTIFY dashboard_refresh;
  RETURN NULL;
END;
$$;

-- Triggers nas tabelas principais
DROP TRIGGER IF EXISTS trg_refresh_on_payment ON payments;
CREATE TRIGGER trg_refresh_on_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS trg_refresh_on_rental ON rentals;
CREATE TRIGGER trg_refresh_on_rental
AFTER INSERT OR UPDATE OR DELETE ON rentals
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS trg_refresh_on_property ON properties;
CREATE TRIGGER trg_refresh_on_property
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS trg_refresh_on_expense ON location_expenses;
CREATE TRIGGER trg_refresh_on_expense
AFTER INSERT OR UPDATE OR DELETE ON location_expenses
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_views();

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON MATERIALIZED VIEW mv_dashboard_stats IS 
  'View materializada com estatísticas principais do dashboard - atualizada via triggers';

COMMENT ON MATERIALIZED VIEW mv_monthly_revenue IS 
  'View materializada com receitas mensais dos últimos 12 meses por localização';

COMMENT ON MATERIALIZED VIEW mv_monthly_expenses IS 
  'View materializada com despesas mensais dos últimos 12 meses por localização';

COMMENT ON FUNCTION refresh_dashboard_views() IS 
  'Refresh manual de todas as views materializadas do dashboard';

-- Realizar primeiro refresh
SELECT refresh_dashboard_views();

-- Confirmar criação
SELECT 'Views materializadas criadas com sucesso!' as message;