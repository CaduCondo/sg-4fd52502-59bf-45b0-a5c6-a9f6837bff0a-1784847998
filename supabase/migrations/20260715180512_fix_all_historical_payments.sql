-- ============================================================================
-- Corrigir TODOS os pagamentos históricos (≤ dez/2025)
-- Usa o valor de JANEIRO/2026 como referência para cada contrato
-- ============================================================================

DO $$
DECLARE
  rental_record RECORD;
  jan2026_payment RECORD;
  affected_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando correção de valores históricos...';
  RAISE NOTICE '📅 Alvo: Pagamentos com vencimento ≤ 31/12/2025';
  RAISE NOTICE '';

  -- Loop em cada contrato ativo
  FOR rental_record IN 
    SELECT DISTINCT r.id, r.value
    FROM rentals r
    WHERE r.status = 'active'
    ORDER BY r.id
  LOOP
    -- Buscar o pagamento de JANEIRO/2026 deste contrato (referência)
    SELECT 
      p.expected_amount,
      p.breakdown
    INTO jan2026_payment
    FROM payments p
    WHERE p.rental_id = rental_record.id
      AND p.reference_month = 1
      AND p.reference_year = 2026
    LIMIT 1;

    -- Se encontrou janeiro/2026, usar como referência
    IF FOUND THEN
      RAISE NOTICE '📋 Contrato ID %: Janeiro/2026 = R$ %', 
        rental_record.id, 
        jan2026_payment.expected_amount;

      -- Atualizar TODOS os pagamentos ≤ dezembro/2025 COM STATUS PENDING
      WITH updated AS (
        UPDATE payments
        SET 
          expected_amount = jan2026_payment.expected_amount,
          breakdown = jan2026_payment.breakdown,
          updated_at = NOW()
        WHERE rental_id = rental_record.id
          AND (
            reference_year < 2026 
            OR (reference_year = 2026 AND reference_month = 12)
          )
          AND due_date <= '2025-12-31'
          AND status = 'pending'  -- ✅ CRÍTICO: Não tocar em pagamentos pagos
        RETURNING *
      )
      SELECT COUNT(*) INTO affected_count FROM updated;

      IF affected_count > 0 THEN
        RAISE NOTICE '   ✅ Atualizados % pagamentos históricos', affected_count;
      END IF;
    ELSE
      RAISE NOTICE '   ⚠️  Contrato ID %: Janeiro/2026 NÃO encontrado (pulando)', rental_record.id;
    END IF;

    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '🎉 Correção concluída!';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Verificação: Mostrar contratos com pagamentos históricos corrigidos
-- ============================================================================

SELECT 
  r.id AS rental_id,
  p.installment_number AS parcela,
  TO_CHAR(p.due_date, 'DD/MM/YYYY') AS vencimento,
  p.reference_month || '/' || p.reference_year AS referencia,
  p.status,
  p.expected_amount AS valor_esperado,
  p.breakdown->0->>'description' AS desc_1,
  (p.breakdown->0->>'amount')::NUMERIC AS valor_1,
  p.breakdown->1->>'description' AS desc_2,
  (p.breakdown->1->>'amount')::NUMERIC AS valor_2
FROM payments p
INNER JOIN rentals r ON p.rental_id = r.id
WHERE p.due_date <= '2025-12-31'
  AND r.status = 'active'
ORDER BY r.id, p.installment_number;