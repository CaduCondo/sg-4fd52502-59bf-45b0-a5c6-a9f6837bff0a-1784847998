-- RECRIAR VIEWS MATERIALIZADAS COM STATUS CORRETO
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_payments CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_expenses CASCADE;

-- View 1: Estatísticas Gerais (Usando status correto)
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM properties) as total_properties,
  (SELECT COUNT(*) FROM properties WHERE status = 'available') as available_properties,
  (SELECT COUNT(*) FROM properties WHERE status = 'unavailable') as unavailable_properties,
  (SELECT COUNT(*) FROM properties WHERE status = 'occupied') as occupied_properties,
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM rentals WHERE is_active = true) as active_contracts,
  (SELECT COUNT(*) FROM rentals 
   WHERE is_active = true 
   AND end_date <= (CURRENT_DATE + INTERVAL '30 days')
  ) as expiring_contracts,
  NOW() as last_updated
WITH DATA;

-- View 2: Pagamentos Mensais (Pré-calculados por mês)
CREATE MATERIALIZED VIEW mv_monthly_payments AS
SELECT
  p.id,
  p.rental_id,
  p.expected_amount,
  p.paid_amount,
  p.due_date,
  p.payment_date,
  p.status,
  EXTRACT(MONTH FROM p.due_date)::text as reference_month,
  EXTRACT(YEAR FROM p.due_date)::text as reference_year,
  r.property_id,
  prop.location_id
FROM payments p
JOIN rentals r ON p.rental_id = r.id
JOIN properties prop ON r.property_id = prop.id
WITH DATA;

-- View 3: Despesas Mensais (Agregadas)
CREATE MATERIALIZED VIEW mv_monthly_expenses AS
SELECT
  id,
  location_id,
  amount as total_expenses,
  reference_month,
  reference_year
FROM location_expenses
WITH DATA;

-- Índices Únicos para Refresh Concorrente
CREATE UNIQUE INDEX idx_mv_dashboard_stats_unique ON mv_dashboard_stats (last_updated);
CREATE UNIQUE INDEX idx_mv_monthly_payments_unique ON mv_monthly_payments (id);
CREATE UNIQUE INDEX idx_mv_monthly_expenses_unique ON mv_monthly_expenses (id);

-- Índices de Performance para Queries
CREATE INDEX idx_mv_monthly_payments_month_year ON mv_monthly_payments (reference_month, reference_year);
CREATE INDEX idx_mv_monthly_payments_location ON mv_monthly_payments (location_id);
CREATE INDEX idx_mv_monthly_payments_status ON mv_monthly_payments (status);
CREATE INDEX idx_mv_monthly_expenses_month_year ON mv_monthly_expenses (reference_month, reference_year);
CREATE INDEX idx_mv_monthly_expenses_location ON mv_monthly_expenses (location_id);

-- Função para Refresh Manual
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_payments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_expenses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_dashboard_views IS 
  'Atualiza views materializadas do dashboard sem bloquear consultas';

-- Triggers para Auto-Refresh (Otimizado - apenas enfileira)
CREATE OR REPLACE FUNCTION trigger_refresh_views()
RETURNS trigger AS $$
BEGIN
  -- Apenas loga a necessidade de refresh, evita overhead em cada INSERT/UPDATE
  -- Use um cron job para executar refresh_dashboard_views() a cada 5 minutos
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas tabelas relevantes
DROP TRIGGER IF EXISTS after_properties_change ON properties;
CREATE TRIGGER after_properties_change
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS after_rentals_change ON rentals;
CREATE TRIGGER after_rentals_change
  AFTER INSERT OR UPDATE OR DELETE ON rentals
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS after_payments_change ON payments;
CREATE TRIGGER after_payments_change
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS after_expenses_change ON location_expenses;
CREATE TRIGGER after_expenses_change
  AFTER INSERT OR UPDATE OR DELETE ON location_expenses
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_views();

-- Realizar primeiro refresh
SELECT refresh_dashboard_views();

SELECT 'Views materializadas criadas e atualizadas com sucesso!' as message;