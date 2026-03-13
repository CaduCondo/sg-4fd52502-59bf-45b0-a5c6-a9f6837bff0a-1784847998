const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jxqhycivhhcfbzmfevtb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cWh5Y2l2aGhjZmJ6bWZldnRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk2MjgxNCwiZXhwIjoyMDUyNTM4ODE0fQ.khKBtqgvVYs3U_c7PuZ7HLiYLqxOGXvK4WaLDrRNl6M';

const supabase = createClient(supabaseUrl, supabaseKey);

function calculateDaysBetween(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMonthsDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function generateExpectedPayments(rental) {
  const payments = [];
  const startDate = new Date(rental.start_date);
  const endDate = new Date(rental.end_date);
  const dueDay = rental.due_day;
  
  // Calcular total de meses do contrato
  const totalMonths = getMonthsDifference(rental.start_date, rental.end_date);
  
  let currentDate = new Date(startDate);
  let paymentNumber = 0;
  let isFirstPayment = true;
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Definir data de vencimento
    let dueDate = new Date(year, month, dueDay);
    
    // Se a data de vencimento for antes da data de início, usar próximo mês
    if (isFirstPayment && dueDate < startDate) {
      dueDate = new Date(year, month + 1, dueDay);
    }
    
    // Calcular período de cobrança
    let periodStart, periodEnd;
    
    if (isFirstPayment) {
      periodStart = new Date(startDate);
      periodEnd = new Date(dueDate);
      periodEnd.setDate(periodEnd.getDate() - 1);
    } else {
      periodStart = new Date(year, month, 1);
      periodEnd = new Date(year, month + 1, 0);
    }
    
    // Ajustar período final se ultrapassar data fim do contrato
    if (periodEnd > endDate) {
      periodEnd = new Date(endDate);
    }
    
    // Calcular dias do período
    const daysInPeriod = calculateDaysBetween(periodStart, periodEnd) + 1;
    
    // Determinar se é proporcional e se conta como parcela
    let description;
    let isProportional = false;
    
    if (isFirstPayment && daysInPeriod < 30) {
      isProportional = true;
      if (daysInPeriod >= 15) {
        paymentNumber = 1;
        description = `1/${totalMonths}`;
      } else {
        description = 'Parcela Proporcional';
      }
    } else if (periodEnd.getTime() === endDate.getTime() && daysInPeriod < 30) {
      // Última parcela proporcional
      isProportional = true;
      description = 'Parcela Proporcional Final';
    } else {
      paymentNumber++;
      description = `${paymentNumber}/${totalMonths}`;
    }
    
    // Calcular valor
    const rentValue = parseFloat(rental.rent_value || 0);
    let amount = rentValue;
    
    if (isProportional) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      amount = (rentValue / daysInMonth) * daysInPeriod;
    }
    
    payments.push({
      rental_id: rental.id,
      due_date: dueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
      status: 'pending',
      payment_number: paymentNumber || null,
      description: description,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0]
    });
    
    isFirstPayment = false;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return payments;
}

async function fixAllRentals() {
  console.log('🔄 Iniciando correção de todos os recebimentos...\n');
  
  try {
    // Buscar todas as locações ativas
    const { data: rentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    
    if (rentalsError) throw rentalsError;
    
    console.log(`📋 Total de locações ativas encontradas: ${rentals.length}\n`);
    
    const summary = {
      totalRentals: rentals.length,
      totalFixed: 0,
      paymentsCreated: 0,
      paymentsUpdated: 0
    };
    
    const details = [];
    
    // Processar cada locação
    for (const rental of rentals) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏠 Processando: ${rental.property_name || 'Imóvel'} - ${rental.tenant_name || 'Inquilino'}`);
      console.log(`   Período: ${rental.start_date} até ${rental.end_date}`);
      
      const rentalChanges = [];
      
      // Buscar recebimentos existentes
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('rental_id', rental.id)
        .order('due_date', { ascending: true });
      
      if (paymentsError) {
        console.log(`   ❌ Erro ao buscar recebimentos: ${paymentsError.message}`);
        continue;
      }
      
      console.log(`   📊 Recebimentos existentes: ${existingPayments.length}`);
      
      // Gerar parcelas esperadas
      const expectedPayments = generateExpectedPayments(rental);
      console.log(`   ✅ Parcelas esperadas: ${expectedPayments.length}`);
      
      // Identificar o que precisa ser criado ou atualizado
      for (const expected of expectedPayments) {
        const existing = existingPayments.find(p => p.due_date === expected.due_date);
        
        if (!existing) {
          // Criar nova parcela
          const { error: insertError } = await supabase
            .from('rental_payments')
            .insert([expected]);
          
          if (insertError) {
            console.log(`   ❌ Erro ao criar parcela ${expected.description}: ${insertError.message}`);
          } else {
            summary.paymentsCreated++;
            rentalChanges.push(`➕ Criada parcela ${expected.description} - Vencimento: ${expected.due_date}`);
          }
        } else if (existing.status !== 'paid') {
          // Atualizar parcela pendente (não mexe em pagas)
          const needsUpdate = 
            existing.payment_number !== expected.payment_number ||
            existing.description !== expected.description ||
            Math.abs(existing.amount - expected.amount) > 0.01;
          
          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('rental_payments')
              .update({
                payment_number: expected.payment_number,
                description: expected.description,
                amount: expected.amount,
                period_start: expected.period_start,
                period_end: expected.period_end
              })
              .eq('id', existing.id);
            
            if (updateError) {
              console.log(`   ❌ Erro ao atualizar parcela ${expected.description}: ${updateError.message}`);
            } else {
              summary.paymentsUpdated++;
              rentalChanges.push(`🔄 Atualizada parcela ${expected.description} - Vencimento: ${expected.due_date}`);
            }
          }
        } else if (existing.status === 'paid') {
          // Para parcelas pagas, só ajusta numeração se necessário
          const needsNumberUpdate = 
            existing.payment_number !== expected.payment_number ||
            existing.description !== expected.description;
          
          if (needsNumberUpdate) {
            const { error: updateError } = await supabase
              .from('rental_payments')
              .update({
                payment_number: expected.payment_number,
                description: expected.description
              })
              .eq('id', existing.id);
            
            if (updateError) {
              console.log(`   ❌ Erro ao atualizar numeração da parcela paga: ${updateError.message}`);
            } else {
              summary.paymentsUpdated++;
              rentalChanges.push(`🔢 Ajustada numeração da parcela PAGA para ${expected.description}`);
            }
          }
        }
      }
      
      if (rentalChanges.length > 0) {
        summary.totalFixed++;
        details.push({
          rentalInfo: `${rental.property_name || 'Imóvel'} - ${rental.tenant_name || 'Inquilino'}`,
          changes: rentalChanges
        });
        
        console.log(`   ✨ Alterações aplicadas: ${rentalChanges.length}`);
        rentalChanges.forEach(change => console.log(`      ${change}`));
      } else {
        console.log(`   ✅ Nenhuma correção necessária`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ CORREÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log('📊 RELATÓRIO GERAL:');
    console.log('━'.repeat(80));
    console.log(`📋 Total de locações analisadas: ${summary.totalRentals}`);
    console.log(`✅ Total de locações corrigidas: ${summary.totalFixed}`);
    console.log(`➕ Total de parcelas criadas: ${summary.paymentsCreated}`);
    console.log(`🔄 Total de parcelas atualizadas: ${summary.paymentsUpdated}`);
    console.log('━'.repeat(80));
    
    if (details.length > 0) {
      console.log('\n📝 DETALHES POR LOCAÇÃO:\n');
      
      details.forEach((detail, index) => {
        console.log(`\n${index + 1}. ${detail.rentalInfo}`);
        console.log(`   Alterações:`);
        detail.changes.forEach(change => {
          console.log(`   ${change}`);
        });
      });
    }
    
    console.log('\n✨ Todas as correções foram aplicadas com sucesso!');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
  }
}

fixAllRentals();