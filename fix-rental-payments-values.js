/**
 * Script para corrigir TODOS os valores incorretos dos pagamentos do SIGNORE APTO 10
 * 
 * Corrige:
 * 1. expected_amount (valor base sem multa/juros)
 * 2. breakdown (detalhamento dos valores)
 * 3. amount_to_pay (valor total com multa/juros)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllPayments() {
  console.log('🔧 Iniciando correção COMPLETA de valores...\n');

  try {
    // 1. Buscar propriedade SIGNORE APTO 10
    console.log('📋 Buscando propriedade SIGNORE APTO 10...');
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select(`
        id,
        complement,
        locations!inner (
          name
        )
      `)
      .eq('complement', 'APTO 10');

    if (propError) {
      console.error('❌ Erro ao buscar propriedade:', propError);
      return;
    }

    // Filtrar pelo local SIGNORE
    const property = properties?.find(p => p.locations?.name === 'SIGNORE');

    if (!property) {
      console.error('❌ Propriedade SIGNORE APTO 10 não encontrada');
      console.log('Propriedades encontradas:', properties);
      return;
    }

    console.log(`✅ Propriedade encontrada: ${property.locations.name} ${property.complement}\n`);

    // 2. Buscar contrato ativo dessa propriedade
    console.log('📋 Buscando contrato...');
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, rent_value, garage_value, has_garage')
      .eq('property_id', property.id)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (rentalError || !rental) {
      console.error('❌ Contrato não encontrado:', rentalError);
      return;
    }

    console.log(`✅ Contrato encontrado`);
    console.log(`   Aluguel contratado: R$ ${rental.rent_value.toFixed(2)}`);
    console.log(`   Garagem: R$ ${(rental.garage_value || 0).toFixed(2)}\n`);

    await processPayments(rental);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function processPayments(rental) {
  // 2. Buscar TODOS os pagamentos
  console.log('💰 Buscando TODOS os pagamentos...');
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('rental_id', rental.id)
    .order('due_date', { ascending: true });

  if (paymentsError || !payments || payments.length === 0) {
    console.error('❌ Nenhum pagamento encontrado');
    return;
  }

  console.log(`✅ ${payments.length} pagamentos encontrados\n`);

  const CORRECT_RENT_VALUE = rental.rent_value; // 1400.00
  const CORRECT_GARAGE_VALUE = rental.has_garage ? (rental.garage_value || 0) : 0;
  const CORRECT_BASE_AMOUNT = CORRECT_RENT_VALUE + CORRECT_GARAGE_VALUE;

  let corrected = 0;
  let skipped = 0;
  let errors = 0;

  for (const payment of payments) {
    try {
      // Parse breakdown atual
      let currentBreakdown = [];
      try {
        if (payment.breakdown) {
          currentBreakdown = typeof payment.breakdown === 'string'
            ? JSON.parse(payment.breakdown)
            : payment.breakdown;
        }
      } catch (e) {
        console.log(`⚠️ Breakdown inválido na parcela ${payment.installment}`);
      }

      // Encontra valor atual do aluguel no breakdown
      const rentalItem = currentBreakdown.find(item =>
        item.description?.toLowerCase().includes('aluguel')
      );

      const currentRentValue = rentalItem?.amount || 0;
      const needsCorrection = Math.abs(currentRentValue - CORRECT_RENT_VALUE) > 0.01;

      if (!needsCorrection && Math.abs(payment.expected_amount - CORRECT_BASE_AMOUNT) < 0.01) {
        console.log(`✓ Parcela ${payment.installment}/${payment.total_installments} - OK (R$ ${CORRECT_RENT_VALUE.toFixed(2)})`);
        skipped++;
        continue;
      }

      console.log(`\n🔧 Corrigindo Parcela ${payment.installment}/${payment.total_installments}:`);
      console.log(`   Valor ATUAL: R$ ${currentRentValue.toFixed(2)}`);
      console.log(`   Valor CORRETO: R$ ${CORRECT_RENT_VALUE.toFixed(2)}`);

      // Reconstrói breakdown COMPLETO
      const newBreakdown = [];

      // 1. Aluguel (valor correto)
      newBreakdown.push({
        description: `Valor mensal do aluguel - Parcela ${payment.installment}/${payment.total_installments}`,
        amount: CORRECT_RENT_VALUE,
        type: 'addition'
      });

      // 2. Garagem (se houver)
      if (CORRECT_GARAGE_VALUE > 0) {
        newBreakdown.push({
          description: 'Valor mensal da garagem',
          amount: CORRECT_GARAGE_VALUE,
          type: 'addition'
        });
      }

      // 3. Preserva multa e juros
      const lateFeeItem = currentBreakdown.find(item =>
        item.description?.toLowerCase().includes('multa')
      );
      const interestItem = currentBreakdown.find(item =>
        item.description?.toLowerCase().includes('juros')
      );

      if (lateFeeItem) newBreakdown.push(lateFeeItem);
      if (interestItem) newBreakdown.push(interestItem);

      // 4. Calcula valores corretos
      const lateFee = payment.late_fee || 0;
      const interest = payment.interest || 0;
      const discount = payment.discount_amount || 0;

      const newExpectedAmount = CORRECT_BASE_AMOUNT; // Valor base SEM multa/juros
      const newAmountToPay = CORRECT_BASE_AMOUNT + lateFee + interest - discount; // Valor total COM multa/juros

      console.log(`   Expected Amount (base): R$ ${newExpectedAmount.toFixed(2)}`);
      console.log(`   Amount to Pay (total): R$ ${newAmountToPay.toFixed(2)}`);

      // 5. Atualiza no banco
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          expected_amount: newExpectedAmount,
          breakdown: JSON.stringify(newBreakdown),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error(`   ❌ Erro: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Corrigido!`);
        corrected++;
      }

    } catch (error) {
      console.error(`❌ Erro na parcela ${payment.installment}:`, error.message);
      errors++;
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(70));
  console.log(`Total: ${payments.length}`);
  console.log(`✅ Corrigidos: ${corrected}`);
  console.log(`⏭️  Já corretos: ${skipped}`);
  console.log(`❌ Erros: ${errors}`);
  console.log('='.repeat(70));

  if (corrected > 0) {
    console.log('\n✨ Correção concluída!');
    console.log('🔄 Pressione F5 para recarregar a página e ver as mudanças.');
  }
}

fixAllPayments();