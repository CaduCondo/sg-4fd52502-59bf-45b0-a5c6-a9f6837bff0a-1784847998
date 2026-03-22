/**
 * Script para corrigir valores de pagamentos de um contrato específico
 * 
 * Problema: Valores de aluguel calculados incorretamente (usando expected_amount
 * em vez de rent_value real do contrato)
 * 
 * Solução: Recalcula o breakdown usando os valores reais do contrato
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Função principal de correção
 */
async function fixRentalPayments() {
  console.log('🔧 Iniciando correção de valores de pagamentos...\n');

  try {
    // 1. Buscar o contrato da Thaynara (Aluguel Mensal: R$ 1.400,00)
    console.log('📋 Buscando contrato...');
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select(`
        id,
        rent_value,
        garage_value,
        has_garage,
        start_date,
        end_date,
        tenants (
          name
        )
      `)
      .eq('rent_value', 1400.00)
      .eq('properties.complement', 'APTO 10')
      .limit(1)
      .single();

    if (rentalError) {
      console.error('❌ Erro ao buscar contrato:', rentalError);
      return;
    }

    if (!rental) {
      console.error('❌ Contrato não encontrado!');
      return;
    }

    console.log(`✅ Contrato encontrado: ${rental.tenants?.name || 'N/A'}`);
    console.log(`   Aluguel: R$ ${rental.rent_value.toFixed(2)}`);
    console.log(`   Garagem: R$ ${(rental.garage_value || 0).toFixed(2)}`);
    console.log(`   ID: ${rental.id}\n`);

    // 2. Buscar todos os pagamentos deste contrato
    console.log('💰 Buscando pagamentos do contrato...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', rental.id)
      .order('due_date', { ascending: true });

    if (paymentsError) {
      console.error('❌ Erro ao buscar pagamentos:', paymentsError);
      return;
    }

    if (!payments || payments.length === 0) {
      console.log('⚠️ Nenhum pagamento encontrado para este contrato');
      return;
    }

    console.log(`✅ ${payments.length} pagamentos encontrados\n`);

    // 3. Processar cada pagamento
    let correctedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const payment of payments) {
      try {
        // Parse do breakdown atual
        let currentBreakdown = [];
        if (payment.breakdown) {
          try {
            currentBreakdown = typeof payment.breakdown === 'string'
              ? JSON.parse(payment.breakdown)
              : payment.breakdown;
          } catch (e) {
            console.log(`⚠️ Erro ao parsear breakdown do pagamento ${payment.installment}: ${e.message}`);
          }
        }

        // Verifica se tem valor de aluguel incorreto no breakdown
        const rentalItem = currentBreakdown.find(item => 
          item.description && 
          (item.description.includes('Aluguel') || item.description.includes('aluguel'))
        );

        const garageItem = currentBreakdown.find(item =>
          item.description &&
          (item.description.includes('Garagem') || item.description.includes('garagem'))
        );

        // Verifica se precisa corrigir
        const hasIncorrectValue = rentalItem && Math.abs(rentalItem.amount - rental.rent_value) > 0.01;

        if (!hasIncorrectValue) {
          console.log(`✓ Parcela ${payment.installment}/${payment.total_installments} - Valores corretos, pulando...`);
          skippedCount++;
          continue;
        }

        console.log(`\n🔧 Corrigindo Parcela ${payment.installment}/${payment.total_installments}:`);
        console.log(`   Valor atual no breakdown: R$ ${rentalItem.amount.toFixed(2)}`);
        console.log(`   Valor correto: R$ ${rental.rent_value.toFixed(2)}`);

        // Reconstrói o breakdown com valores corretos
        const newBreakdown = [];

        // 1. Adiciona aluguel com valor correto
        newBreakdown.push({
          description: `Valor mensal do aluguel - Parcela ${payment.installment}/${payment.total_installments}`,
          amount: rental.rent_value,
          type: 'addition'
        });

        // 2. Adiciona garagem se houver
        if (rental.has_garage && rental.garage_value > 0) {
          newBreakdown.push({
            description: 'Valor mensal da garagem',
            amount: rental.garage_value,
            type: 'addition'
          });
        }

        // 3. Mantém multas e juros existentes
        const lateFeeItem = currentBreakdown.find(item =>
          item.description && item.description.includes('Multa')
        );
        const interestItem = currentBreakdown.find(item =>
          item.description && item.description.includes('Juros')
        );

        if (lateFeeItem) {
          newBreakdown.push(lateFeeItem);
        }

        if (interestItem) {
          newBreakdown.push(interestItem);
        }

        // 4. Calcula novo expected_amount
        const baseAmount = rental.rent_value + (rental.has_garage ? (rental.garage_value || 0) : 0);
        const lateFee = payment.late_fee || 0;
        const interest = payment.interest || 0;
        const discount = payment.discount_amount || 0;
        const newExpectedAmount = baseAmount + lateFee + interest - discount;

        console.log(`   Novo expected_amount: R$ ${newExpectedAmount.toFixed(2)}`);

        // 5. Atualiza no banco de dados
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            breakdown: JSON.stringify(newBreakdown),
            expected_amount: newExpectedAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Corrigido com sucesso!`);
          correctedCount++;
        }

      } catch (error) {
        console.error(`❌ Erro ao processar parcela ${payment.installment}:`, error);
        errorCount++;
      }
    }

    // 4. Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(60));
    console.log(`Total de pagamentos: ${payments.length}`);
    console.log(`✅ Corrigidos: ${correctedCount}`);
    console.log(`⏭️  Pulados (já corretos): ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log('='.repeat(60));

    if (correctedCount > 0) {
      console.log('\n✨ Correção concluída com sucesso!');
      console.log('🔄 Recarregue a página para ver os valores atualizados.');
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

// Executa o script
fixRentalPayments();