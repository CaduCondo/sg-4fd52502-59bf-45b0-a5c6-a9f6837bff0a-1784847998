-- ========================================
-- OTIMIZAÇÃO #1: ÍNDICES PARCIAIS
-- Acelera queries de registros ativos/pendentes
-- Reduz tamanho dos índices em 60-80%
-- ========================================

-- Índice parcial: Contratos ativos (mais usado)
CREATE INDEX IF NOT EXISTS idx_rentals_active_only 
ON rentals(property_id, tenant_id) 
WHERE is_active = true;

-- Índice parcial: Pagamentos pendentes/atrasados (queries frequentes)
CREATE INDEX IF NOT EXISTS idx_payments_pending_only 
ON payments(due_date, rental_id) 
WHERE status IN ('pending', 'overdue');

-- Índice parcial: Parcelas de caução pendentes
CREATE INDEX IF NOT EXISTS idx_deposit_installments_pending 
ON deposit_installments(rental_id, due_date) 
WHERE status = 'pending';