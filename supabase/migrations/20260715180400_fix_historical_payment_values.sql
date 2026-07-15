-- Corrigir valores históricos de pagamentos específicos
-- Parcelas 1-3 (out/nov/dez 2025) da locação que foram alteradas incorretamente
-- Restaurar valores originais de R$ 1.500,00

-- IMPORTANTE: Ajustar rental_id conforme necessário
-- Este script é um exemplo - execute manualmente no SQL Editor do Supabase
-- após identificar o rental_id correto

DO $$
DECLARE
  v_rental_id UUID;
  v_payment_record RECORD;
BEGIN
  -- ⚠️ AJUSTAR: Encontrar o rental_id correto
  -- Exemplo: locação do imóvel que teve os valores alterados
  -- SELECT id INTO v_rental_id FROM rentals WHERE property_id = '...';
  
  -- Para este exemplo, vamos buscar locações ativas com valores incorretos
  -- Você deve ajustar a query conforme necessário
  
  RAISE NOTICE '🔍 Buscando pagamentos históricos com valores incorretos...';
  
  -- Atualizar pagamentos de out/nov/dez 2025 que estão com R$ 1.650 mas deveriam estar com R$ 1.500
  FOR v_payment_record IN
    SELECT p.id, p.expected_amount, p.reference_month, p.reference_year, p.rental_id
    FROM payments p
    WHERE p.reference_year = 2025
      AND p.reference_month IN (10, 11, 12)
      AND p.expected_amount = 1650.00
      AND p.due_date < CURRENT_DATE  -- Apenas pagamentos passados
  LOOP
    RAISE NOTICE '📝 Corrigindo pagamento ID: % (Mês: %/%) de R$ 1.650 → R$ 1.500', 
      v_payment_record.id, 
      v_payment_record.reference_month, 
      v_payment_record.reference_year;
    
    -- Atualizar expected_amount e breakdown
    UPDATE payments
    SET 
      expected_amount = 1500.00,
      breakdown = jsonb_build_array(
        jsonb_build_object(
          'type', 'addition',
          'amount', 1500.00,
          'description', 'Aluguel'
        )
      )
    WHERE id = v_payment_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Correção concluída!';
END $$;

-- Verificação: Listar pagamentos corrigidos
SELECT 
  p.id,
  r.id as rental_id,
  prop.location,
  p.reference_month,
  p.reference_year,
  p.expected_amount,
  p.status,
  p.breakdown
FROM payments p
JOIN rentals r ON p.rental_id = r.id
JOIN properties prop ON r.property_id = prop.id
WHERE p.reference_year = 2025
  AND p.reference_month IN (10, 11, 12)
  AND p.due_date < CURRENT_DATE
ORDER BY p.reference_year, p.reference_month;