import { supabase } from "@/integrations/supabase/client";
import type { Rental } from "@/types";

/**
 * Service para gerenciar atualizações de recebimentos quando uma locação é editada
 */

interface RentalUpdateChanges {
  startDate?: string;
  endDate?: string | null;
  monthlyRent?: number;
  paymentDay?: number;
  hasGarage?: boolean;
  garageValue?: number;
}

interface RentValueAdjustment {
  rentalId: string;
  oldValue: number;
  newValue: number;
  effectiveDate: string; // Data em que a mudança entra em vigor
}

interface PaymentToUpdate {
  id: string;
  installment: number | null;
  total_installments: number | null;
  reference_month: string;
  reference_year: string;
  due_date: string;
  expected_amount: number;
  status: string;
  paid_amount: number;
}

/**
 * Ajusta o valor do aluguel de uma locação ativa e recalcula os recebimentos futuros
 */
async function adjustRentalValue(adjustment: RentValueAdjustment): Promise<void> {
  console.log("💰 [adjustRentalValue] Iniciando ajuste de valor do aluguel...");
  console.log("📋 Dados do ajuste:", adjustment);

  const { rentalId, oldValue, newValue, effectiveDate } = adjustment;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveDateTime = new Date(effectiveDate + "T00:00:00");

  // Buscar a locação para obter informações necessárias
  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .single();

  if (rentalError || !rental) {
    console.error("❌ Erro ao buscar locação:", rentalError);
    throw new Error("Locação não encontrada");
  }

  console.log("📋 Locação encontrada:", {
    id: rental.id,
    valor_antigo: oldValue,
    valor_novo: newValue,
    dia_pagamento: (rental as any).payment_day,
  });

  // Buscar TODOS os recebimentos pendentes futuros (>= data efetiva)
  const { data: pendingPayments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .in("status", ["pending", "overdue"])
    .order("reference_year", { ascending: true })
    .order("reference_month", { ascending: true });

  if (paymentsError) {
    console.error("❌ Erro ao buscar pagamentos:", paymentsError);
    throw paymentsError;
  }

  console.log(`📊 Total de recebimentos pendentes: ${(pendingPayments || []).length}`);

  if (!pendingPayments || pendingPayments.length === 0) {
    console.log("ℹ️ Nenhum recebimento pendente para atualizar");
    return;
  }

  // Separar período atual e períodos futuros
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const currentPeriodPayment = pendingPayments.find(
    p => Number(p.reference_month) === currentMonth && Number(p.reference_year) === currentYear
  );

  const futurePayments = pendingPayments.filter(
    p => {
      const paymentYear = Number(p.reference_year);
      const paymentMonth = Number(p.reference_month);
      return paymentYear > currentYear || (paymentYear === currentYear && paymentMonth > currentMonth);
    }
  );

  console.log(`📊 Recebimento período atual: ${currentPeriodPayment ? "Sim" : "Não"}`);
  console.log(`📊 Recebimentos futuros: ${futurePayments.length}`);

  const updates: Array<{ id: string; changes: any }> = [];

  // 1. ATUALIZAR PERÍODO ATUAL (proporcional)
  if (currentPeriodPayment) {
    console.log("📅 Processando período atual (proporcional)...");
    
    const paymentDay = (rental as any).payment_day;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // Calcular dias restantes do mês a partir de hoje
    const daysRemaining = daysInMonth - today.getDate() + 1;
    
    // Calcular dias que já passaram com valor antigo
    const daysPassed = today.getDate() - 1; // Não incluir hoje
    
    console.log(`📊 Dias do mês: ${daysInMonth}`);
    console.log(`📊 Dias com valor ANTIGO: ${daysPassed}`);
    console.log(`📊 Dias com valor NOVO: ${daysRemaining}`);
    
    // Calcular valores proporcionais
    const dailyRateOld = oldValue / 30;
    const dailyRateNew = newValue / 30;
    
    const amountForOldDays = dailyRateOld * daysPassed;
    const amountForNewDays = dailyRateNew * daysRemaining;
    const totalAmount = amountForOldDays + amountForNewDays;
    
    console.log(`💰 Cálculo proporcional:`);
    console.log(`   - Valor antigo (${daysPassed} dias): R$ ${amountForOldDays.toFixed(2)}`);
    console.log(`   - Valor novo (${daysRemaining} dias): R$ ${amountForNewDays.toFixed(2)}`);
    console.log(`   - Total: R$ ${totalAmount.toFixed(2)}`);
    
    // Criar breakdown detalhado
    const breakdown = [
      {
        type: "addition",
        amount: parseFloat(amountForOldDays.toFixed(2)),
        description: `Aluguel - Valor Antigo (${daysPassed} dias)`
      },
      {
        type: "addition",
        amount: parseFloat(amountForNewDays.toFixed(2)),
        description: `Aluguel - Valor Novo (${daysRemaining} dias)`
      }
    ];

    // Adicionar garagem se houver
    if (rental.has_garage && rental.garage_value) {
      const garageAmount = rental.garage_value;
      breakdown.push({
        type: "addition",
        amount: parseFloat(garageAmount.toFixed(2)),
        description: "Garagem"
      });
    }

    updates.push({
      id: currentPeriodPayment.id,
      changes: {
        expected_amount: parseFloat(totalAmount.toFixed(2)),
        breakdown: breakdown
      }
    });

    console.log(`✅ Período atual atualizado: R$ ${totalAmount.toFixed(2)}`);
  }

  // 2. ATUALIZAR PERÍODOS FUTUROS (valor integral novo)
  console.log(`📅 Processando ${futurePayments.length} períodos futuros...`);
  
  const garageAmount = (rental.has_garage && rental.garage_value) ? rental.garage_value : 0;
  const totalNewValue = newValue + garageAmount;

  for (const payment of futurePayments) {
    const breakdown = [
      {
        type: "addition",
        amount: parseFloat(newValue.toFixed(2)),
        description: "Aluguel"
      }
    ];

    if (garageAmount > 0) {
      breakdown.push({
        type: "addition",
        amount: parseFloat(garageAmount.toFixed(2)),
        description: "Garagem"
      });
    }

    updates.push({
      id: payment.id,
      changes: {
        expected_amount: parseFloat(totalNewValue.toFixed(2)),
        breakdown: breakdown
      }
    });

    console.log(`   ✅ ${payment.reference_month}/${payment.reference_year}: R$ ${totalNewValue.toFixed(2)}`);
  }

  // 3. EXECUTAR TODAS AS ATUALIZAÇÕES
  console.log(`🔄 Aplicando ${updates.length} atualizações...`);
  
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("payments")
      .update(update.changes)
      .eq("id", update.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar recebimento ${update.id}:`, updateError);
      throw updateError;
    }
  }

  console.log("✅ Todos os recebimentos foram atualizados com sucesso!");
}

/**
 * Calcula o número de dias entre duas datas
 */
function getDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o valor proporcional baseado nos dias
 */
function calculateProportionalAmount(monthlyRent: number, days: number): number {
  return Number(((monthlyRent / 30) * days).toFixed(2));
}

/**
 * Calcula a nova data de vencimento baseado no dia de pagamento
 */
function calculateDueDate(referenceMonth: number, referenceYear: number, paymentDay: number): string {
  const dueDate = new Date(referenceYear, referenceMonth - 1, paymentDay);
  return dueDate.toISOString().split('T')[0];
}

/**
 * Calcula o total de meses entre duas datas
 */
function getMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  
  return months + 1; // +1 para incluir o mês inicial
}

/**
 * Verifica se uma data está no início do mês baseado no dia de pagamento
 */
function isStartOfMonth(date: Date, paymentDay: number): boolean {
  return date.getDate() === paymentDay;
}

/**
 * Verifica se uma data está no fim do mês baseado no dia de pagamento
 */
function isEndOfMonth(date: Date, paymentDay: number): boolean {
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const expectedEndDay = paymentDay - 1;
  return date.getDate() === (expectedEndDay === 0 ? lastDayOfMonth : expectedEndDay);
}

export const rentalUpdateService = {
  /**
   * Ajusta o valor do aluguel e atualiza os recebimentos futuros
   */
  adjustRentalValue,

  /**
   * Analisa as mudanças e atualiza os recebimentos conforme necessário
   */
  async updatePaymentsOnRentalEdit(
    rentalId: string,
    oldRental: Rental,
    newChanges: RentalUpdateChanges
  ): Promise<void> {
    console.log("🚀🚀🚀 [rentalUpdateService] FUNÇÃO CHAMADA - Iniciando análise de mudanças...");
    console.log("🔑 Rental ID recebido:", rentalId);
    console.log("📋 Old Rental recebido:", JSON.stringify(oldRental, null, 2));
    console.log("🆕 New Changes recebido:", JSON.stringify(newChanges, null, 2));
    console.log("📅 Comparação de datas de início:");
    console.log("   - oldRental.startDate:", oldRental.startDate);
    console.log("   - newChanges.startDate:", newChanges.startDate);
    console.log("   - São diferentes?", newChanges.startDate !== oldRental.startDate);
    console.log("📅 Data final antiga:", oldRental.endDate);
    console.log("📅 Data final nova:", newChanges.endDate);

    // Buscar todos os recebimentos da locação
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .order("reference_year", { ascending: true })
      .order("reference_month", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar recebimentos:", error);
      throw error;
    }

    if (!payments || payments.length === 0) {
      console.log("ℹ️ Nenhum recebimento encontrado para esta locação");
      return;
    }

    console.log(`📊 Total de recebimentos encontrados: ${payments.length}`);
    console.log("📋 Primeiros 3 recebimentos:", payments.slice(0, 3));
    console.log("📋 Últimos 3 recebimentos:", payments.slice(-3));

    // Filtrar apenas recebimentos pendentes (não pagos e sem pagamento parcial)
    const pendingPayments = payments.filter(p => 
      p.status === "pending" || p.status === "overdue"
    ) as PaymentToUpdate[];

    console.log(`📊 Recebimentos pendentes: ${pendingPayments.length}`);

    // Verificar mudanças e aplicar atualizações
    const updates: Array<{ id: string; changes: any }> = [];

    // 1. MUDANÇA NA DATA DE INÍCIO
    if (newChanges.startDate && newChanges.startDate !== oldRental.startDate) {
      console.log("📅 Detectada mudança na data de início");
      console.log(`   - Data antiga: ${oldRental.startDate}`);
      console.log(`   - Data nova: ${newChanges.startDate}`);
      
      const oldStartDate = new Date(oldRental.startDate + "T00:00:00");
      const newStartDate = new Date(newChanges.startDate + "T00:00:00");
      
      const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;
      const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;

      // CENÁRIO 1: Data de início ANTECIPADA (movida para trás) - precisa CRIAR recebimentos faltantes
      if (newStartDate < oldStartDate) {
        console.log("🔙 Data de início ANTECIPADA - criando recebimentos faltantes...");
        
        // Buscar todos os pagamentos existentes
        const { data: existingPayments, error: existingError } = await supabase
          .from("payments")
          .select("reference_month, reference_year")
          .eq("rental_id", rentalId);

        if (existingError) {
          console.error("❌ Erro ao buscar pagamentos existentes:", existingError);
          throw existingError;
        }

        const existingRefs = new Set(
          (existingPayments || []).map(p => `${p.reference_year}-${p.reference_month}`)
        );

        console.log("🔍 Recebimentos existentes:", Array.from(existingRefs).sort());

        // Calcular primeiro mês de pagamento baseado na NOVA data de início
        const startDay = newStartDate.getDate();
        const startMonth = newStartDate.getMonth() + 1;
        const startYear = newStartDate.getFullYear();
        
        let firstPaymentMonth: number;
        let firstPaymentYear: number;
        let firstPaymentDays: number;
        
        if (startDay === paymentDay) {
          // Dia início === dia vencimento → primeiro pagamento no MÊS SEGUINTE (integral)
          firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
          firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
          firstPaymentDays = 30;
          console.log(`📅 Primeiro pagamento: ${firstPaymentMonth}/${firstPaymentYear} (INTEGRAL)`);
        } else if (startDay < paymentDay) {
          // Dia início < dia vencimento → primeiro pagamento no MESMO MÊS (proporcional)
          firstPaymentMonth = startMonth;
          firstPaymentYear = startYear;
          firstPaymentDays = paymentDay - startDay;
          console.log(`📅 Primeiro pagamento: ${firstPaymentMonth}/${firstPaymentYear} (PROPORCIONAL - ${firstPaymentDays} dias)`);
        } else {
          // Dia início > dia vencimento → primeiro pagamento no PRÓXIMO MÊS (proporcional)
          firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
          firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
          
          const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
          const daysUntilEndOfStartMonth = daysInStartMonth - startDay + 1;
          firstPaymentDays = daysUntilEndOfStartMonth + (paymentDay - 1);
          console.log(`📅 Primeiro pagamento: ${firstPaymentMonth}/${firstPaymentYear} (PROPORCIONAL - ${firstPaymentDays} dias)`);
        }

        // Gerar todos os pagamentos desde a nova data de início até o primeiro existente
        const newPayments = [];
        const currentDate = new Date(firstPaymentYear, firstPaymentMonth - 1, 1);
        
        // Encontrar o último mês que precisamos criar (menor mês existente)
        let stopBeforeMonth: number | null = null;
        let stopBeforeYear: number | null = null;
        
        if (existingPayments && existingPayments.length > 0) {
          const sortedExisting = existingPayments
            .map(p => ({
              month: Number(p.reference_month),
              year: Number(p.reference_year),
            }))
            .sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month - b.month;
            });
          
          stopBeforeMonth = sortedExisting[0].month;
          stopBeforeYear = sortedExisting[0].year;
          console.log(`⏹️ Parar antes de: ${stopBeforeMonth}/${stopBeforeYear}`);
        }

        let monthCount = 0;
        while (true) {
          const month = currentDate.getMonth() + 1;
          const year = currentDate.getFullYear();
          const refKey = `${year}-${month}`;
          
          // Parar se chegamos no primeiro mês existente
          if (stopBeforeMonth && stopBeforeYear) {
            if (year > stopBeforeYear || (year === stopBeforeYear && month >= stopBeforeMonth)) {
              console.log(`⏹️ Parando em ${month}/${year} (chegou no primeiro existente)`);
              break;
            }
          }
          
          // Só criar se não existir
          if (!existingRefs.has(refKey)) {
            const dueDate = new Date(year, month - 1, paymentDay);
            const isFirstPayment = (year === firstPaymentYear && month === firstPaymentMonth);
            
            monthCount++;
            console.log(`➕ Criando pagamento ${monthCount}: ${month}/${year} (primeiro? ${isFirstPayment})`);
            
            if (isFirstPayment && firstPaymentDays !== 30) {
              // Primeiro pagamento proporcional
              const proportionalRent = (monthlyRent / 30) * firstPaymentDays;
              const proportionalGarage = garageAmount > 0 ? (garageAmount / 30) * firstPaymentDays : 0;
              const proportionalTotal = proportionalRent + proportionalGarage;
              
              const breakdown = [
                {
                  description: `Aluguel - Primeira Parcela (${firstPaymentDays} dias)`,
                  amount: parseFloat(proportionalRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (garageAmount > 0) {
                breakdown.push({
                  description: `Garagem (${firstPaymentDays} dias)`,
                  amount: parseFloat(proportionalGarage.toFixed(2)),
                  type: "addition",
                });
              }

              newPayments.push({
                rental_id: rentalId,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: parseFloat(proportionalTotal.toFixed(2)),
                status: "pending",
                breakdown: breakdown,
              });
              
              console.log(`   ✅ Primeiro pagamento PROPORCIONAL: R$ ${proportionalTotal.toFixed(2)} (${firstPaymentDays} dias)`);
            } else {
              // Pagamento integral
              const breakdown = [
                {
                  description: "Aluguel",
                  amount: parseFloat(monthlyRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (garageAmount > 0) {
                breakdown.push({
                  description: "Garagem",
                  amount: parseFloat(garageAmount.toFixed(2)),
                  type: "addition",
                });
              }

              newPayments.push({
                rental_id: rentalId,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: totalMonthlyRent,
                status: "pending",
                breakdown: breakdown,
              });
              
              console.log(`   ✅ Pagamento INTEGRAL: R$ ${totalMonthlyRent.toFixed(2)}`);
            }
          } else {
            console.log(`   ⏭️ Mês ${month}/${year} já existe, pulando...`);
          }
          
          // Avançar para o próximo mês
          currentDate.setMonth(currentDate.getMonth() + 1);
          
          // Segurança: parar após 100 meses
          if (monthCount > 100) {
            console.log("⚠️ Limite de segurança atingido (100 meses)");
            break;
          }
        }

        console.log(`📊 Total de novos pagamentos a criar: ${newPayments.length}`);

        // Inserir novos pagamentos
        if (newPayments.length > 0) {
          console.log("💾 Inserindo novos pagamentos no banco...");
          
          const { data: insertedData, error: insertError } = await supabase
            .from("payments")
            .insert(newPayments)
            .select();

          if (insertError) {
            console.error("❌ Erro ao inserir novos pagamentos:", insertError);
            throw insertError;
          } else {
            console.log(`✅ ${newPayments.length} novos pagamentos criados com sucesso!`);
          }

          // Atualizar total_installments
          const { data: allPaymentsAfter } = await supabase
            .from("payments")
            .select("id")
            .eq("rental_id", rentalId);

          const totalInstallments = (allPaymentsAfter || []).length;

          await supabase
            .from("payments")
            .update({ total_installments: totalInstallments })
            .eq("rental_id", rentalId);

          console.log(`✅ Total de parcelas atualizado: ${totalInstallments}`);
        }

        // Atualizar o primeiro pagamento existente se necessário (pode ter ficado proporcional quando deveria ser integral)
        if (stopBeforeMonth && stopBeforeYear) {
          const firstExistingRef = `${stopBeforeYear}-${stopBeforeMonth}`;
          const firstExistingPayment = payments.find(
            p => `${p.reference_year}-${p.reference_month}` === firstExistingRef && 
                 (p.status === "pending" || p.status === "overdue")
          );
          
          if (firstExistingPayment) {
            console.log(`🔄 Verificando primeiro pagamento existente: ${stopBeforeMonth}/${stopBeforeYear}`);
            
            // Verificar se deveria ser integral
            const shouldBeIntegral = (
              (stopBeforeMonth === firstPaymentMonth && stopBeforeYear === firstPaymentYear) ? 
              false : // É o primeiro proporcional
              true    // É um mês subsequente integral
            );
            
            if (shouldBeIntegral && firstExistingPayment.expected_amount !== totalMonthlyRent) {
              console.log(`🔄 Convertendo primeiro existente de proporcional para INTEGRAL`);
              
              const breakdown = [
                {
                  description: "Aluguel",
                  amount: parseFloat(monthlyRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (garageAmount > 0) {
                breakdown.push({
                  description: "Garagem",
                  amount: parseFloat(garageAmount.toFixed(2)),
                  type: "addition",
                });
              }

              updates.push({
                id: firstExistingPayment.id,
                changes: {
                  expected_amount: totalMonthlyRent,
                  breakdown: breakdown,
                }
              });
              
              console.log(`✅ Primeiro pagamento existente atualizado para INTEGRAL: R$ ${totalMonthlyRent.toFixed(2)}`);
            }
          }
        }
      }
      // CENÁRIO 2: Data de início POSTERGADA (movida para frente) - atualizar primeiro pagamento
      else if (newStartDate > oldStartDate) {
        console.log("⏩ Data de início POSTERGADA - atualizando primeiro pagamento...");
        
        const firstPayment = payments.find(p => p.installment === null || p.installment === 1);
        
        if (firstPayment && (firstPayment.status === "pending" || firstPayment.status === "overdue")) {
          const startDay = newStartDate.getDate();
          const startMonth = newStartDate.getMonth() + 1;
          const startYear = newStartDate.getFullYear();

          // Determinar o mês do primeiro pagamento
          let firstPaymentMonth: number;
          let firstPaymentYear: number;
          let daysToCharge: number;
          
          if (startDay === paymentDay) {
            firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
            firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
            daysToCharge = 30;
          } else if (startDay < paymentDay) {
            firstPaymentMonth = startMonth;
            firstPaymentYear = startYear;
            daysToCharge = paymentDay - startDay;
          } else {
            firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
            firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
            
            const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
            const daysUntilEndOfStartMonth = daysInStartMonth - startDay + 1;
            daysToCharge = daysUntilEndOfStartMonth + (paymentDay - 1);
          }

          const newDueDate = new Date(firstPaymentYear, firstPaymentMonth - 1, paymentDay);
          const isProportional = daysToCharge !== 30;
          
          if (isProportional) {
            const proportionalAmount = calculateProportionalAmount(totalMonthlyRent, daysToCharge);
            
            updates.push({
              id: firstPayment.id,
              changes: {
                due_date: newDueDate.toISOString().split('T')[0],
                expected_amount: proportionalAmount,
              }
            });
            
            console.log(`✅ Primeira parcela (proporcional): ${daysToCharge} dias = R$ ${proportionalAmount.toFixed(2)}`);
          } else {
            updates.push({
              id: firstPayment.id,
              changes: {
                due_date: newDueDate.toISOString().split('T')[0],
                expected_amount: totalMonthlyRent,
              }
            });
            
            console.log(`✅ Primeira parcela (integral): R$ ${totalMonthlyRent.toFixed(2)}`);
          }
        }
      }
    }

    // 2. MUDANÇA NA DATA DE TÉRMINO
    if (newChanges.endDate !== undefined && newChanges.endDate !== oldRental.endDate) {
      console.log("📅 Detectada mudança na data de término");
      console.log("🔍 DEBUG - Valores recebidos:");
      console.log("   - newChanges.endDate:", newChanges.endDate);
      console.log("   - oldRental.endDate:", oldRental.endDate);
      console.log("   - newChanges.endDate !== oldRental.endDate?", newChanges.endDate !== oldRental.endDate);
      
      const startDate = new Date((newChanges.startDate ?? oldRental.startDate) + "T00:00:00");
      const oldEndDate = oldRental.endDate ? new Date(oldRental.endDate + "T00:00:00") : null;
      const newEndDate = newChanges.endDate ? new Date(newChanges.endDate + "T00:00:00") : null;
      
      console.log("📅 Datas convertidas:");
      console.log("   - startDate:", startDate);
      console.log("   - oldEndDate:", oldEndDate);
      console.log("   - newEndDate:", newEndDate);
      
      const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;
      const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;

      if (newEndDate && oldEndDate) {
        console.log("🔍 Comparando datas:");
        console.log("   oldEndDate:", oldEndDate.toISOString());
        console.log("   newEndDate:", newEndDate.toISOString());
        console.log("   newEndDate.getTime():", newEndDate.getTime());
        console.log("   oldEndDate.getTime():", oldEndDate.getTime());
        console.log("   newEndDate > oldEndDate?", newEndDate > oldEndDate);
        console.log("   newEndDate.getTime() > oldEndDate.getTime()?", newEndDate.getTime() > oldEndDate.getTime());
        
        // CENÁRIO: Extensão do contrato (nova data final é POSTERIOR à antiga)
        if (newEndDate > oldEndDate) {
          console.log("🎯 ✅ CONDIÇÃO DE EXTENSÃO ATINGIDA!");
          console.log("📈 EXTENSÃO DE CONTRATO DETECTADA!");
          console.log(`   - Data final antiga: ${oldEndDate.toISOString().split('T')[0]}`);
          console.log(`   - Data final nova: ${newEndDate.toISOString().split('T')[0]}`);
          
          // Buscar o rental ATUALIZADO do banco para garantir valores corretos
          const { data: updatedRental, error: rentalError } = await supabase
            .from("rentals")
            .select("rent_value, has_garage, garage_value")
            .eq("id", rentalId)
            .single();

          if (rentalError) {
            console.error("❌ Erro ao buscar rental atualizado:", rentalError);
            throw rentalError;
          }

          // Usar valores ATUALIZADOS do banco
          const currentMonthlyRent = updatedRental.rent_value || 0;
          const currentHasGarage = updatedRental.has_garage;
          const currentGarageValue = updatedRental.garage_value || 0;
          const currentGarageAmount = currentHasGarage ? currentGarageValue : 0;
          const currentTotalRent = currentMonthlyRent + currentGarageAmount;

          console.log("💰 Valores ATUAIS do rental (do banco):");
          console.log("   - Aluguel: R$", currentMonthlyRent.toFixed(2));
          console.log("   - Garagem:", currentHasGarage ? `R$ ${currentGarageValue.toFixed(2)}` : "Não");
          console.log("   - Total: R$", currentTotalRent.toFixed(2));
          
          // Buscar TODOS os pagamentos existentes (não apenas o último)
          const { data: allExistingPayments, error: existingError } = await supabase
            .from("payments")
            .select("id, reference_month, reference_year, status, expected_amount")
            .eq("rental_id", rentalId)
            .order("reference_year", { ascending: false })
            .order("reference_month", { ascending: false });

          if (existingError) {
            console.error("❌ Erro ao buscar pagamentos existentes:", existingError);
            throw existingError;
          }

          console.log(`📊 Total de pagamentos existentes: ${allExistingPayments?.length || 0}`);

          // Criar Set de meses que já existem
          const existingRefs = new Set(
            (allExistingPayments || []).map(p => `${p.reference_year}-${p.reference_month}`)
          );

          console.log("🔍 Meses que já existem:", Array.from(existingRefs).sort());

          // Verificar se o último pagamento existente era proporcional
          const lastExistingPayment = allExistingPayments?.[0];
          if (lastExistingPayment) {
            const lastMonth = Number(lastExistingPayment.reference_month);
            const lastYear = Number(lastExistingPayment.reference_year);
            const lastDayOfMonth = new Date(lastYear, lastMonth, 0).getDate();
            const oldEndDay = oldEndDate.getDate();
            
            // Se era proporcional (não cobrava mês completo) E ainda está pendente
            const wasProportional = oldEndDay < lastDayOfMonth;
            
            if (wasProportional && lastExistingPayment.status === 'pending') {
              console.log("🔄 Último pagamento anterior era PROPORCIONAL - atualizando para INTEGRAL com valores ATUAIS");
              
              const integralBreakdown = [
                {
                  description: "Aluguel",
                  amount: parseFloat(currentMonthlyRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (currentGarageAmount > 0) {
                integralBreakdown.push({
                  description: "Garagem",
                  amount: parseFloat(currentGarageAmount.toFixed(2)),
                  type: "addition",
                });
              }

              const { error: updateError } = await supabase
                .from("payments")
                .update({
                  expected_amount: currentTotalRent,
                  breakdown: integralBreakdown,
                })
                .eq("id", lastExistingPayment.id);

              if (updateError) {
                console.error("❌ Erro ao atualizar último pagamento:", updateError);
              } else {
                console.log(`✅ Pagamento ${lastMonth}/${lastYear} atualizado de proporcional para integral: R$ ${currentTotalRent.toFixed(2)}`);
                console.log(`✅ Breakdown atualizado:`, integralBreakdown);
              }
            }
          }

          // Gerar TODOS os meses do período estendido
          console.log("📝 Gerando novos pagamentos para o período estendido...");
          
          // Começar do mês SEGUINTE ao último existente
          let currentDate: Date;
          
          if (lastExistingPayment) {
            currentDate = new Date(
              parseInt(lastExistingPayment.reference_year),
              parseInt(lastExistingPayment.reference_month), // avança 1 mês automaticamente (índice 0-11)
              1
            );
            console.log(`📅 Último pagamento existente: ${lastExistingPayment.reference_month}/${lastExistingPayment.reference_year}`);
            console.log(`📅 Começando novos pagamentos de: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`);
          } else {
            currentDate = new Date(startDate);
            console.log(`📅 Nenhum pagamento existente, começando da data de início`);
          }

          const newPayments = [];
          let monthCount = 0;

          // Loop até a nova data final (INCLUINDO o mês final)
          while (currentDate <= newEndDate) {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const refKey = `${year}-${month}`;
            
            monthCount++;
            
            // Só criar se não existir
            if (!existingRefs.has(refKey)) {
              const dueDate = new Date(year, month - 1, paymentDay);
              const isLastMonth = (year === newEndDate.getFullYear() && month === newEndDate.getMonth() + 1);
              
              console.log(`➕ Criando pagamento ${monthCount}: ${month}/${year} (último? ${isLastMonth})`);
              
              if (isLastMonth) {
                // Último mês - verificar se é proporcional
                const endDay = newEndDate.getDate();
                const daysInMonth = new Date(year, month, 0).getDate();
                const isProportional = endDay < daysInMonth;
                
                if (isProportional) {
                  // Proporcional - usar valores ATUAIS
                  const proportionalRent = (currentMonthlyRent / 30) * endDay;
                  const proportionalGarage = currentGarageAmount > 0 ? (currentGarageAmount / 30) * endDay : 0;
                  const proportionalTotal = proportionalRent + proportionalGarage;
                  
                  const breakdown = [
                    {
                      description: `Aluguel - Última Parcela (${endDay} dias)`,
                      amount: parseFloat(proportionalRent.toFixed(2)),
                      type: "addition",
                    }
                  ];

                  if (currentGarageAmount > 0) {
                    breakdown.push({
                      description: `Garagem (${endDay} dias)`,
                      amount: parseFloat(proportionalGarage.toFixed(2)),
                      type: "addition",
                    });
                  }

                  newPayments.push({
                    rental_id: rentalId,
                    reference_month: month.toString(),
                    reference_year: year.toString(),
                    due_date: dueDate.toISOString().split('T')[0],
                    expected_amount: parseFloat(proportionalTotal.toFixed(2)),
                    status: "pending",
                    breakdown: breakdown,
                  });
                  
                  console.log(`   ✅ Último mês PROPORCIONAL: R$ ${proportionalTotal.toFixed(2)} (${endDay} dias)`);
                  console.log(`   📋 Breakdown:`, breakdown);
                } else {
                  // Último mês integral - usar valores ATUAIS
                  const breakdown = [
                    {
                      description: "Aluguel",
                      amount: parseFloat(currentMonthlyRent.toFixed(2)),
                      type: "addition",
                    }
                  ];

                  if (currentGarageAmount > 0) {
                    breakdown.push({
                      description: "Garagem",
                      amount: parseFloat(currentGarageAmount.toFixed(2)),
                      type: "addition",
                    });
                  }

                  newPayments.push({
                    rental_id: rentalId,
                    reference_month: month.toString(),
                    reference_year: year.toString(),
                    due_date: dueDate.toISOString().split('T')[0],
                    expected_amount: currentTotalRent,
                    status: "pending",
                    breakdown: breakdown,
                  });
                  
                  console.log(`   ✅ Último mês INTEGRAL: R$ ${currentTotalRent.toFixed(2)}`);
                  console.log(`   📋 Breakdown:`, breakdown);
                }
              } else {
                // Mês intermediário - sempre integral com valores ATUAIS
                const breakdown = [
                  {
                    description: "Aluguel",
                    amount: parseFloat(currentMonthlyRent.toFixed(2)),
                    type: "addition",
                  }
                ];

                if (currentGarageAmount > 0) {
                  breakdown.push({
                    description: "Garagem",
                    amount: parseFloat(currentGarageAmount.toFixed(2)),
                    type: "addition",
                  });
                }

                newPayments.push({
                  rental_id: rentalId,
                  reference_month: month.toString(),
                  reference_year: year.toString(),
                  due_date: dueDate.toISOString().split('T')[0],
                  expected_amount: currentTotalRent,
                  status: "pending",
                  breakdown: breakdown,
                });
                
                console.log(`   ✅ Mês intermediário INTEGRAL: R$ ${currentTotalRent.toFixed(2)}`);
                console.log(`   📋 Breakdown:`, breakdown);
              }
            } else {
              console.log(`   ⏭️ Mês ${month}/${year} já existe, pulando...`);
            }
            
            // Avançar para o próximo mês
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          console.log(`📊 Total de novos pagamentos gerados: ${newPayments.length}`);
          console.log(`📊 Total de meses processados: ${monthCount}`);

          // Inserir novos pagamentos
          if (newPayments.length > 0) {
            console.log("💾 Inserindo novos pagamentos no banco...");
            console.log("📋 Pagamentos a inserir:", JSON.stringify(newPayments, null, 2));
            
            const { data: insertedData, error: insertError } = await supabase
              .from("payments")
              .insert(newPayments)
              .select();

            if (insertError) {
              console.error("❌ Erro ao inserir novos pagamentos:", insertError);
              console.error("❌ Detalhes completos:", JSON.stringify(insertError, null, 2));
              throw insertError;
            } else {
              console.log(`✅ ${newPayments.length} novos pagamentos criados com sucesso!`);
              console.log("✅ Pagamentos inseridos:", insertedData);
            }
          } else {
            console.log("⚠️ AVISO: Nenhum novo pagamento foi gerado!");
            console.log("⚠️ Verifique:");
            console.log("   - Todos os meses entre o último existente e a nova data fim já têm pagamentos?");
            console.log("   - A nova data fim é realmente posterior à antiga?");
            console.log("   - Meses existentes:", Array.from(existingRefs).sort());
          }

          // Atualizar total_installments de TODOS os pagamentos da locação
          const { data: allPaymentsAfterInsert } = await supabase
            .from("payments")
            .select("id")
            .eq("rental_id", rentalId);

          const totalInstallments = (allPaymentsAfterInsert || []).length;

          const { error: updateTotalError } = await supabase
            .from("payments")
            .update({ total_installments: totalInstallments })
            .eq("rental_id", rentalId);

          if (updateTotalError) {
            console.error("❌ Erro ao atualizar total_installments:", updateTotalError);
          } else {
            console.log(`✅ Total de parcelas atualizado: ${totalInstallments}`);
          }
        } else {
          console.log("❌ CONDIÇÃO DE EXTENSÃO NÃO ATINGIDA - newEndDate NÃO é maior que oldEndDate");
          console.log("   Possíveis cenários:");
          console.log("   - Redução de contrato (newEndDate < oldEndDate)");
          console.log("   - Mesma data (newEndDate === oldEndDate)");
        }
      } else {
        console.log("⚠️ AVISO: Uma das datas é null");
        console.log("   - newEndDate:", newEndDate);
        console.log("   - oldEndDate:", oldEndDate);
      }

      if (newEndDate) {
        // Calcular novo total de parcelas
        const newTotalInstallments = getMonthsBetween(startDate, newEndDate);
        
        // Verificar se última parcela é proporcional
        const isLastProportional = !isEndOfMonth(newEndDate, paymentDay);
        
        if (isLastProportional) {
          // Buscar última parcela
          const lastPayment = payments.find(p => 
            p.installment === payments.length || 
            (p.total_installments && p.installment === p.total_installments + 1)
          );
          
          if (lastPayment && (lastPayment.status === "pending" || lastPayment.status === "overdue")) {
            // Calcular data de vencimento da última parcela
            const lastDueDate = new Date(newEndDate);
            lastDueDate.setDate(paymentDay);
            if (lastDueDate < newEndDate) {
              lastDueDate.setMonth(lastDueDate.getMonth() + 1);
            }
            
            // Calcular início do último período
            const lastPeriodStart = new Date(newEndDate.getFullYear(), newEndDate.getMonth(), paymentDay);
            const days = getDaysBetween(lastPeriodStart, newEndDate);
            const proportionalAmount = calculateProportionalAmount(totalMonthlyRent, days);
            
            updates.push({
              id: lastPayment.id,
              changes: {
                due_date: lastDueDate.toISOString().split('T')[0],
                expected_amount: proportionalAmount,
                total_installments: newTotalInstallments,
              }
            });
            
            console.log(`✅ Última parcela (proporcional): ${days} dias = R$ ${proportionalAmount.toFixed(2)}`);
          }
        }
        
        // Atualizar total_installments de todos os recebimentos pendentes
        for (const payment of pendingPayments) {
          const existingUpdate = updates.find(u => u.id === payment.id);
          if (existingUpdate) {
            existingUpdate.changes.total_installments = newTotalInstallments;
          } else {
            updates.push({
              id: payment.id,
              changes: {
                total_installments: newTotalInstallments,
              }
            });
          }
        }
      }
    }

    // 3. MUDANÇA NO VALOR DO ALUGUEL ou GARAGEM
    if (
      (newChanges.monthlyRent !== undefined && newChanges.monthlyRent !== oldRental.monthlyRent) ||
      (newChanges.hasGarage !== undefined && newChanges.hasGarage !== oldRental.hasGarage) ||
      (newChanges.garageValue !== undefined && newChanges.garageValue !== oldRental.garageValue)
    ) {
      console.log("💰 Detectada mudança no valor do aluguel ou garagem");
      console.log("   Valor antigo aluguel:", oldRental.monthlyRent);
      console.log("   Valor novo aluguel:", newChanges.monthlyRent);
      console.log("   Garagem antiga:", oldRental.hasGarage, oldRental.garageValue);
      console.log("   Garagem nova:", newChanges.hasGarage, newChanges.garageValue);
      
      const newMonthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const newGarageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const newTotalRent = newMonthlyRent + newGarageAmount;
      
      console.log("💰 Novo valor total a aplicar: R$", newTotalRent.toFixed(2));
      console.log("   - Aluguel: R$", newMonthlyRent.toFixed(2));
      console.log("   - Garagem: R$", newGarageAmount.toFixed(2));
      
      // Buscar TODOS os recebimentos pendentes novamente (pode ter sido criados novos na seção 2)
      const { data: allPendingPayments, error: pendingError } = await supabase
        .from("payments")
        .select("*")
        .eq("rental_id", rentalId)
        .in("status", ["pending", "overdue"])
        .order("reference_year", { ascending: true })
        .order("reference_month", { ascending: true });

      if (pendingError) {
        console.error("❌ Erro ao buscar recebimentos pendentes:", pendingError);
        throw pendingError;
      }

      const currentPendingPayments = (allPendingPayments || []) as PaymentToUpdate[];
      console.log(`📊 Total de recebimentos pendentes (incluindo novos): ${currentPendingPayments.length}`);
      
      // Atualizar TODOS os recebimentos pendentes com novo valor E breakdown
      for (const payment of currentPendingPayments) {
        console.log(`📝 Processando recebimento ${payment.installment} (${payment.reference_month}/${payment.reference_year})`);
        
        // Verificar se este recebimento é proporcional (primeiro ou último)
        const isProporcional = payment.installment === 1 || 
                              (payment.total_installments && payment.installment === payment.total_installments + 1);
        
        let finalExpectedAmount: number;
        let breakdown: any[];
        
        if (isProporcional && payment.expected_amount !== newTotalRent) {
          // Proporcional - manter o expected_amount mas atualizar as proporções no breakdown
          finalExpectedAmount = payment.expected_amount;
          
          // Calcular proporção
          const proportion = finalExpectedAmount / newTotalRent;
          const proportionalRent = newMonthlyRent * proportion;
          const proportionalGarage = newGarageAmount * proportion;
          
          breakdown = [
            {
              description: "Aluguel",
              amount: parseFloat(proportionalRent.toFixed(2)),
              type: "addition",
            }
          ];

          if (newGarageAmount > 0) {
            breakdown.push({
              description: "Garagem",
              amount: parseFloat(proportionalGarage.toFixed(2)),
              type: "addition",
            });
          }
          
          console.log(`   ✅ Recebimento PROPORCIONAL - Expected: R$ ${finalExpectedAmount.toFixed(2)}, Breakdown: Aluguel R$ ${proportionalRent.toFixed(2)} + Garagem R$ ${proportionalGarage.toFixed(2)}`);
        } else {
          // Integral - atualizar expected_amount E breakdown
          finalExpectedAmount = newTotalRent;
          
          breakdown = [
            {
              description: "Aluguel",
              amount: parseFloat(newMonthlyRent.toFixed(2)),
              type: "addition",
            }
          ];

          if (newGarageAmount > 0) {
            breakdown.push({
              description: "Garagem",
              amount: parseFloat(newGarageAmount.toFixed(2)),
              type: "addition",
            });
          }
          
          console.log(`   ✅ Recebimento INTEGRAL - Expected: R$ ${finalExpectedAmount.toFixed(2)}, Breakdown: Aluguel R$ ${newMonthlyRent.toFixed(2)} + Garagem R$ ${newGarageAmount.toFixed(2)}`);
        }
        
        // Verificar se já foi atualizado nas seções anteriores
        const alreadyUpdated = updates.find(u => u.id === payment.id);
        
        if (alreadyUpdated) {
          // Se já existe update, atualizar expected_amount e breakdown
          console.log(`   ℹ️ Recebimento já tem update pendente, sobrescrevendo valores`);
          alreadyUpdated.changes.expected_amount = parseFloat(finalExpectedAmount.toFixed(2));
          alreadyUpdated.changes.breakdown = breakdown;
        } else {
          // Criar novo update com expected_amount e breakdown
          console.log(`   ➕ Criando novo update para este recebimento`);
          updates.push({
            id: payment.id,
            changes: {
              expected_amount: parseFloat(finalExpectedAmount.toFixed(2)),
              breakdown: breakdown,
            }
          });
        }
      }
      
      console.log(`✅ Total de ${currentPendingPayments.length} recebimentos pendentes processados para atualização de valor`);
    }

    // 4. MUDANÇA NO DIA DE PAGAMENTO
    if (newChanges.paymentDay !== undefined && newChanges.paymentDay !== oldRental.paymentDay) {
      console.log("📆 Detectada mudança no dia de pagamento");
      
      const oldPaymentDay = oldRental.paymentDay;
      const newPaymentDay = newChanges.paymentDay;
      const daysDifference = newPaymentDay - oldPaymentDay;
      
      console.log(`📊 Mudança de vencimento: Dia ${oldPaymentDay} → Dia ${newPaymentDay} (${daysDifference > 0 ? '+' : ''}${daysDifference} dias)`);
      
      const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;
      
      // CORREÇÃO: Filtrar apenas recebimentos pendentes >= data atual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futurePendingPayments = pendingPayments.filter(p => {
        const dueDate = new Date(p.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });
      
      console.log(`📊 Total de recebimentos pendentes: ${pendingPayments.length}`);
      console.log(`📊 Recebimentos pendentes FUTUROS (>= hoje): ${futurePendingPayments.length}`);
      
      // Encontrar o PRÓXIMO pagamento pendente (>= data atual)
      const firstPendingPayment = futurePendingPayments[0];
      
      if (firstPendingPayment) {
        console.log(`📅 Próximo recebimento pendente: ${firstPendingPayment.reference_month}/${firstPendingPayment.reference_year} (vencimento: ${firstPendingPayment.due_date})`);
        
        // Calcular o valor diário baseado em 30 dias (padrão)
        const dailyRate = totalMonthlyRent / 30;
        
        // Calcular o valor dos dias extras/faltantes
        const adjustmentAmount = dailyRate * Math.abs(daysDifference);
        
        console.log(`💰 Cálculo do ajuste:`, {
          totalMonthlyRent,
          dailyRate: dailyRate.toFixed(2),
          daysDifference,
          adjustmentAmount: adjustmentAmount.toFixed(2)
        });
        
        // Novo valor esperado
        let newExpectedAmount: number;
        let adjustmentDescription: string;
        
        if (daysDifference > 0) {
          // Vencimento adiado (mais dias) - ADICIONAR ao valor
          newExpectedAmount = totalMonthlyRent + adjustmentAmount;
          adjustmentDescription = `Ajuste mudança vencimento (${oldPaymentDay} → ${newPaymentDay}) - ${Math.abs(daysDifference)} dias extras`;
        } else {
          // Vencimento antecipado (menos dias) - SUBTRAIR do valor
          newExpectedAmount = totalMonthlyRent - adjustmentAmount;
          adjustmentDescription = `Ajuste mudança vencimento (${oldPaymentDay} → ${newPaymentDay}) - ${Math.abs(daysDifference)} dias a menos`;
        }
        
        // Calcular a nova data de vencimento
        const newDueDate = calculateDueDate(
          Number(firstPendingPayment.reference_month), 
          Number(firstPendingPayment.reference_year), 
          newPaymentDay
        );
        
        // Criar breakdown detalhado
        const referenceMonth = firstPendingPayment.reference_month;
        const referenceYear = firstPendingPayment.reference_year;
        const monthName = new Date(Number(referenceYear), Number(referenceMonth) - 1).toLocaleString('pt-BR', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        
        const breakdown = [
          {
            type: "addition",
            amount: parseFloat(monthlyRent.toFixed(2)),
            description: "Aluguel"
          }
        ];

        if (garageAmount > 0) {
          breakdown.push({
            type: "addition",
            amount: parseFloat(garageAmount.toFixed(2)),
            description: "Garagem"
          });
        }

        // Adicionar o ajuste
        if (daysDifference !== 0) {
          breakdown.push({
            type: "addition",
            amount: parseFloat(adjustmentAmount.toFixed(2)),
            description: adjustmentDescription
          });
        }
        
        updates.push({
          id: firstPendingPayment.id,
          changes: {
            due_date: newDueDate,
            expected_amount: parseFloat(newExpectedAmount.toFixed(2)),
            breakdown: breakdown,
          }
        });
        
        console.log(`✅ Próximo recebimento pendente atualizado:`);
        console.log(`   - Período: ${capitalizedMonth}/${referenceYear}`);
        console.log(`   - Nova data: ${newDueDate}`);
        console.log(`   - Novo valor: R$ ${newExpectedAmount.toFixed(2)}`);
        console.log(`   - Breakdown:`, breakdown);
      } else {
        console.log("⚠️ Nenhum recebimento pendente futuro encontrado para aplicar ajuste");
      }
      
      // Atualizar due_date dos demais recebimentos pendentes FUTUROS (sem cobrar dias extras)
      for (let i = 1; i < futurePendingPayments.length; i++) {
        const payment = futurePendingPayments[i];
        const newDueDate = calculateDueDate(
          Number(payment.reference_month), 
          Number(payment.reference_year), 
          newPaymentDay
        );
        
        const existingUpdate = updates.find(u => u.id === payment.id);
        if (existingUpdate) {
          existingUpdate.changes.due_date = newDueDate;
        } else {
          updates.push({
            id: payment.id,
            changes: {
              due_date: newDueDate,
            }
          });
        }
        
        console.log(`✅ Recebimento ${payment.installment}: Nova data ${newDueDate}`);
      }
    }

    // Executar todas as atualizações
    if (updates.length > 0) {
      console.log(`🔄 Aplicando ${updates.length} atualizações...`);
      console.log("📋 Resumo das atualizações:", updates.map(u => ({
        id: u.id,
        changes: u.changes
      })));
      
      for (const update of updates) {
        console.log(`🔄 Atualizando recebimento ${update.id}...`);
        console.log(`   Mudanças:`, update.changes);
        
        const { data: updatedData, error: updateError } = await supabase
          .from("payments")
          .update(update.changes)
          .eq("id", update.id)
          .select();
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar recebimento ${update.id}:`, updateError);
        } else {
          console.log(`✅ Recebimento ${update.id} atualizado com sucesso`);
          console.log(`   Dados atualizados no banco:`, updatedData);
        }
      }
      
      console.log("✅ Todas as atualizações foram aplicadas com sucesso!");
    } else {
      console.log("ℹ️ Nenhuma atualização necessária nos recebimentos");
    }

    // VERIFICAÇÃO FINAL: Garantir que todos os recebimentos existem até a data fim
    console.log("🔍 VERIFICAÇÃO FINAL: Checando se há recebimentos faltantes...");
    
    const finalEndDate = (newChanges.endDate ?? oldRental.endDate);
    
    if (finalEndDate) {
      console.log("📅 Data fim do contrato:", finalEndDate);
      
      // Buscar o rental ATUALIZADO do banco
      const { data: currentRental, error: rentalError } = await supabase
        .from("rentals")
        .select("rent_value, has_garage, garage_value")
        .eq("id", rentalId)
        .single();

      if (rentalError) {
        console.error("❌ Erro ao buscar rental:", rentalError);
        throw rentalError;
      }

      const currentMonthlyRent = currentRental.rent_value || 0;
      const currentHasGarage = currentRental.has_garage;
      const currentGarageValue = currentRental.garage_value || 0;
      const currentGarageAmount = currentHasGarage ? currentGarageValue : 0;
      const currentTotalRent = currentMonthlyRent + currentGarageAmount;
      const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;

      console.log("💰 Valores atuais do contrato:");
      console.log("   - Aluguel: R$", currentMonthlyRent.toFixed(2));
      console.log("   - Garagem:", currentHasGarage ? `R$ ${currentGarageValue.toFixed(2)}` : "Não");
      console.log("   - Total: R$", currentTotalRent.toFixed(2));
      console.log("   - Dia pagamento:", paymentDay);
      
      // Buscar TODOS os pagamentos existentes
      const { data: allPayments, error: paymentsError } = await supabase
        .from("payments")
        .select("reference_month, reference_year")
        .eq("rental_id", rentalId)
        .order("reference_year", { ascending: false })
        .order("reference_month", { ascending: false });

      if (paymentsError) {
        console.error("❌ Erro ao buscar pagamentos:", paymentsError);
        throw paymentsError;
      }

      console.log(`📊 Total de pagamentos existentes: ${allPayments?.length || 0}`);

      // Criar Set de meses que já existem
      const existingRefs = new Set(
        (allPayments || []).map(p => `${p.reference_year}-${p.reference_month}`)
      );

      console.log("🔍 Meses existentes:", Array.from(existingRefs).sort());

      // Determinar de onde começar
      const endDate = new Date(finalEndDate + "T00:00:00");
      let startFrom: Date;

      if (allPayments && allPayments.length > 0) {
        const lastPayment = allPayments[0];
        startFrom = new Date(
          parseInt(lastPayment.reference_year),
          parseInt(lastPayment.reference_month), // avança 1 mês automaticamente
          1
        );
        console.log(`📅 Último pagamento: ${lastPayment.reference_month}/${lastPayment.reference_year}`);
        console.log(`📅 Começando verificação de: ${startFrom.getMonth() + 1}/${startFrom.getFullYear()}`);
      } else {
        const startDate = new Date((newChanges.startDate ?? oldRental.startDate) + "T00:00:00");
        startFrom = startDate;
        console.log(`📅 Nenhum pagamento, começando da data início`);
      }

      // Verificar quais meses estão faltando
      const missingPayments = [];
      const currentDate = new Date(startFrom);
      let checkCount = 0;

      while (currentDate <= endDate) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const refKey = `${year}-${month}`;
        
        checkCount++;
        
        if (!existingRefs.has(refKey)) {
          console.log(`❌ Faltando recebimento: ${month}/${year}`);
          
          const dueDate = new Date(year, month - 1, paymentDay);
          const isLastMonth = (year === endDate.getFullYear() && month === endDate.getMonth() + 1);
          
          if (isLastMonth) {
            // Último mês - verificar se é proporcional
            const endDay = endDate.getDate();
            const daysInMonth = new Date(year, month, 0).getDate();
            const isProportional = endDay < daysInMonth;
            
            if (isProportional) {
              // Proporcional
              const proportionalRent = (currentMonthlyRent / 30) * endDay;
              const proportionalGarage = currentGarageAmount > 0 ? (currentGarageAmount / 30) * endDay : 0;
              const proportionalTotal = proportionalRent + proportionalGarage;
              
              const breakdown = [
                {
                  description: `Aluguel - Última Parcela (${endDay} dias)`,
                  amount: parseFloat(proportionalRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (currentGarageAmount > 0) {
                breakdown.push({
                  description: `Garagem (${endDay} dias)`,
                  amount: parseFloat(proportionalGarage.toFixed(2)),
                  type: "addition",
                });
              }

              missingPayments.push({
                rental_id: rentalId,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: parseFloat(proportionalTotal.toFixed(2)),
                status: "pending",
                breakdown: breakdown,
              });
              
              console.log(`   ➕ Último mês PROPORCIONAL: R$ ${proportionalTotal.toFixed(2)} (${endDay} dias)`);
            } else {
              // Último mês integral
              const breakdown = [
                {
                  description: "Aluguel",
                  amount: parseFloat(currentMonthlyRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (currentGarageAmount > 0) {
                breakdown.push({
                  description: "Garagem",
                  amount: parseFloat(currentGarageAmount.toFixed(2)),
                  type: "addition",
                });
              }

              missingPayments.push({
                rental_id: rentalId,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: currentTotalRent,
                status: "pending",
                breakdown: breakdown,
              });
              
              console.log(`   ➕ Último mês INTEGRAL: R$ ${currentTotalRent.toFixed(2)}`);
            }
          } else {
            // Mês intermediário - sempre integral
            const breakdown = [
              {
                description: "Aluguel",
                amount: parseFloat(currentMonthlyRent.toFixed(2)),
                type: "addition",
              }
            ];

            if (currentGarageAmount > 0) {
              breakdown.push({
                description: "Garagem",
                amount: parseFloat(currentGarageAmount.toFixed(2)),
                type: "addition",
              });
            }

            missingPayments.push({
              rental_id: rentalId,
              reference_month: month.toString(),
              reference_year: year.toString(),
              due_date: dueDate.toISOString().split('T')[0],
              expected_amount: currentTotalRent,
              status: "pending",
              breakdown: breakdown,
            });
            
            console.log(`   ➕ Mês intermediário INTEGRAL: R$ ${currentTotalRent.toFixed(2)}`);
          }
        } else {
          console.log(`   ✅ Mês ${month}/${year} já existe`);
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      console.log(`📊 Total de meses verificados: ${checkCount}`);
      console.log(`📊 Total de pagamentos faltantes: ${missingPayments.length}`);

      // Inserir pagamentos faltantes
      if (missingPayments.length > 0) {
        console.log("💾 Criando recebimentos faltantes...");
        console.log("📋 Pagamentos a criar:", JSON.stringify(missingPayments, null, 2));
        
        const { data: insertedData, error: insertError } = await supabase
          .from("payments")
          .insert(missingPayments)
          .select();

        if (insertError) {
          console.error("❌ Erro ao criar recebimentos faltantes:", insertError);
          console.error("❌ Detalhes:", JSON.stringify(insertError, null, 2));
          throw insertError;
        } else {
          console.log(`✅ ${missingPayments.length} recebimentos faltantes criados!`);
          console.log("✅ Dados inseridos:", insertedData);
          
          // Atualizar total_installments
          const { data: allPaymentsAfter } = await supabase
            .from("payments")
            .select("id")
            .eq("rental_id", rentalId);

          const totalInstallments = (allPaymentsAfter || []).length;

          const { error: updateTotalError } = await supabase
            .from("payments")
            .update({ total_installments: totalInstallments })
            .eq("rental_id", rentalId);

          if (updateTotalError) {
            console.error("❌ Erro ao atualizar total_installments:", updateTotalError);
          } else {
            console.log(`✅ Total de parcelas atualizado: ${totalInstallments}`);
          }
        }
      } else {
        console.log("✅ Todos os recebimentos já existem até a data fim do contrato");
      }
    } else {
      console.log("⚠️ Contrato sem data fim definida - pulando verificação");
    }
  }
};