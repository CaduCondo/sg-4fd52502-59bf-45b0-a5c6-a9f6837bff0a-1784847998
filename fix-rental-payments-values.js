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
        ),
        properties (
          address,
          complement
        )
      `)
      .eq('rent_value', 1400.00)
      .limit(10);

    if (rentalError) {
      console.error('❌ Erro ao buscar contrato:', rentalError);
      return;
    }

    if (!rental || rental.length === 0) {
      console.error('❌ Contrato não encontrado!');
      return;
    }

    // Filtrar pelo complemento APTO 10
    const targetRental = rental.find(r => r.properties?.complement === 'APTO 10');

    if (!targetRental) {
      console.error('❌ Contrato do APTO 10 não encontrado!');
      console.log('Contratos encontrados:', rental.map(r => ({
        tenant: r.tenants?.name,
        complement: r.properties?.complement,
        rent: r.rent_value
      })));
      return;
    }

    console.log(`✅ Contrato encontrado: ${targetRental.tenants?.name || 'N/A'}`);
    console.log(`   Aluguel: R$ ${targetRental.rent_value.toFixed(2)}`);
    console.log(`   Garagem: R$ ${(targetRental.garage_value || 0).toFixed(2)}`);
    console.log(`   Complemento: ${targetRental.properties?.complement || 'N/A'}`);
    console.log(`   ID: ${targetRental.id}\n`);

    // 2. Buscar todos os pagamentos deste contrato
    console.log('💰 Buscando pagamentos do contrato...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', targetRental.id)
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
        const hasIncorrectValue = rentalItem && Math.abs(rentalItem.amount - targetRental.rent_value) > 0.01;

        if (!hasIncorrectValue) {
          console.log(`✓ Parcela ${payment.installment}/${payment.total_installments} - Valores corretos, pulando...`);
          skippedCount++;
          continue;
        }

        console.log(`\n🔧 Corrigindo Parcela ${payment.installment}/${payment.total_installments}:`);
        console.log(`   Valor atual no breakdown: R$ ${rentalItem.amount.toFixed(2)}`);
        console.log(`   Valor correto: R$ ${targetRental.rent_value.toFixed(2)}`);

        // Reconstrói o breakdown com valores corretos
        const newBreakdown = [];

        // 1. Adiciona aluguel com valor correto
        newBreakdown.push({
          description: `Valor mensal do aluguel - Parcela ${payment.installment}/${payment.total_installments}`,
          amount: targetRental.rent_value,
          type: 'addition'
        });

        // 2. Adiciona garagem se houver
        if (targetRental.has_garage && targetRental.garage_value > 0) {
          newBreakdown.push({
            description: 'Valor mensal da garagem',
            amount: targetRental.garage_value,
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
        const baseAmount = targetRental.rent_value + (targetRental.has_garage ? (targetRental.garage_value || 0) : 0);
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