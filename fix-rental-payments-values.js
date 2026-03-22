/**
 * Script para corrigir valores de pagamentos do contrato SIGNORE APTO 10
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixRentalPayments() {
  console.log('🔧 Iniciando correção...\n');

  try {
    // 1. Buscar contratos com rent_value = 1400
    const { data: rentals, error: rentalError } = await supabase
      .from('rentals')
      .select('id, rent_value, garage_value, has_garage, property_id')
      .eq('rent_value', 1400.00);

    if (rentalError) throw rentalError;
    if (!rentals || rentals.length === 0) {
      console.log('❌ Nenhum contrato encontrado');
      return;
    }

    // 2. Para cada contrato, buscar o imóvel e verificar se é APTO 10
    let targetRental = null;
    for (const rental of rentals) {
      const { data: property } = await supabase
        .from('properties')
        .select('complement')
        .eq('id', rental.property_id)
        .single();

      if (property?.complement === 'APTO 10') {
        targetRental = rental;
        console.log(`✅ Contrato encontrado: SIGNORE APTO 10`);
        console.log(`   Aluguel: R$ ${rental.rent_value.toFixed(2)}`);
        console.log(`   ID: ${rental.id}\n`);
        break;
      }
    }

    if (!targetRental) {
      console.log('❌ Contrato APTO 10 não encontrado');
      return;
    }

    // 3. Buscar pagamentos do contrato
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', targetRental.id)
      .order('due_date', { ascending: true });

    if (paymentsError) throw paymentsError;
    if (!payments || payments.length === 0) {
      console.log('⚠️ Nenhum pagamento encontrado');
      return;
    }

    console.log(`💰 ${payments.length} pagamentos encontrados\n`);

    // 4. Processar cada pagamento
    let correctedCount = 0;
    let skippedCount = 0;

    for (const payment of payments) {
      let currentBreakdown = [];
      if (payment.breakdown) {
        try {
          currentBreakdown = typeof payment.breakdown === 'string'
            ? JSON.parse(payment.breakdown)
            : payment.breakdown;
        } catch (e) {
          console.log(`⚠️ Erro parsing breakdown parcela ${payment.installment}`);
        }
      }

      const rentalItem = currentBreakdown.find(item => 
        item.description && item.description.toLowerCase().includes('aluguel')
      );

      const hasIncorrectValue = rentalItem && Math.abs(rentalItem.amount - targetRental.rent_value) > 0.01;

      if (!hasIncorrectValue) {
        console.log(`✓ Parcela ${payment.installment}/${payment.total_installments} - OK`);
        skippedCount++;
        continue;
      }

      console.log(`\n🔧 Corrigindo Parcela ${payment.installment}/${payment.total_installments}:`);
      console.log(`   Valor atual: R$ ${rentalItem.amount.toFixed(2)}`);
      console.log(`   Valor correto: R$ ${targetRental.rent_value.toFixed(2)}`);

      // Reconstrói breakdown
      const newBreakdown = [];

      newBreakdown.push({
        description: `Valor mensal do aluguel - Parcela ${payment.installment}/${payment.total_installments}`,
        amount: targetRental.rent_value,
        type: 'addition'
      });

      if (targetRental.has_garage && targetRental.garage_value > 0) {
        newBreakdown.push({
          description: 'Valor mensal da garagem',
          amount: targetRental.garage_value,
          type: 'addition'
        });
      }

      const lateFeeItem = currentBreakdown.find(item =>
        item.description && item.description.includes('Multa')
      );
      const interestItem = currentBreakdown.find(item =>
        item.description && item.description.includes('Juros')
      );

      if (lateFeeItem) newBreakdown.push(lateFeeItem);
      if (interestItem) newBreakdown.push(interestItem);

      const baseAmount = targetRental.rent_value + (targetRental.has_garage ? (targetRental.garage_value || 0) : 0);
      const lateFee = payment.late_fee || 0;
      const interest = payment.interest || 0;
      const discount = payment.discount_amount || 0;
      const newExpectedAmount = baseAmount + lateFee + interest - discount;

      console.log(`   Novo expected_amount: R$ ${newExpectedAmount.toFixed(2)}`);

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          breakdown: JSON.stringify(newBreakdown),
          expected_amount: newExpectedAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error(`   ❌ Erro: ${updateError.message}`);
      } else {
        console.log(`   ✅ Corrigido!`);
        correctedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(60));
    console.log(`Total: ${payments.length}`);
    console.log(`✅ Corrigidos: ${correctedCount}`);
    console.log(`⏭️  Pulados: ${skippedCount}`);
    console.log('='.repeat(60));

    if (correctedCount > 0) {
      console.log('\n✨ Correção concluída!');
      console.log('🔄 Recarregue a página de Recebimentos.');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixRentalPayments();