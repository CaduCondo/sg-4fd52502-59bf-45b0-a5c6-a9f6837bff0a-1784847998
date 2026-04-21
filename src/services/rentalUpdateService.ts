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
   * Analisa as mudanças e atualiza os recebimentos conforme necessário
   */
  async updatePaymentsOnRentalEdit(
    rentalId: string,
    oldRental: Rental,
    newChanges: RentalUpdateChanges
  ): Promise<void> {
    console.log("🔄 [rentalUpdateService] Iniciando análise de mudanças...");
    console.log("📋 Mudanças recebidas:", newChanges);

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
      const firstPayment = payments.find(p => p.installment === null || p.installment === 1);
      
      if (firstPayment && (firstPayment.status === "pending" || firstPayment.status === "overdue")) {
        const newStartDate = new Date(newChanges.startDate + "T00:00:00");
        const startDay = newStartDate.getDate();
        const startMonth = newStartDate.getMonth() + 1;
        const startYear = newStartDate.getFullYear();
        
        const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;
        const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
        const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
          ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
          : 0;
        const totalMonthlyRent = monthlyRent + garageAmount;

        // Determinar o mês do primeiro pagamento
        let firstPaymentMonth: number;
        let firstPaymentYear: number;
        let daysToCharge: number;
        
        // REGRA: Se dia_inicio === dia_vencimento, primeira parcela no mês seguinte (integral)
        if (startDay === paymentDay) {
          console.log("🎯 REGRA: Dia início === Dia vencimento → Primeira parcela no MÊS SEGUINTE (integral)");
          firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
          firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
          daysToCharge = 30; // Mês completo
        }
        // REGRA: Se dia_inicio < dia_vencimento, primeira parcela no mesmo mês (proporcional)
        else if (startDay < paymentDay) {
          console.log("🎯 REGRA: Dia início < Dia vencimento → Primeira parcela no MESMO MÊS (proporcional)");
          firstPaymentMonth = startMonth;
          firstPaymentYear = startYear;
          daysToCharge = paymentDay - startDay + 1;
        }
        // REGRA: Se dia_inicio > dia_vencimento, primeira parcela no próximo mês (proporcional)
        else {
          console.log("🎯 REGRA: Dia início > Dia vencimento → Primeira parcela no PRÓXIMO MÊS (proporcional)");
          firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
          firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
          
          // Calcular dias proporcionais
          const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
          const daysUntilEndOfStartMonth = daysInStartMonth - startDay + 1;
          daysToCharge = daysUntilEndOfStartMonth + paymentDay;
        }

        // Calcular a data de vencimento correta
        const newDueDate = new Date(firstPaymentYear, firstPaymentMonth - 1, paymentDay);

        // Verificar se é proporcional
        const isProportional = daysToCharge !== 30;
        
        if (isProportional) {
          // Calcular valor proporcional
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

    // 2. MUDANÇA NA DATA DE TÉRMINO
    if (newChanges.endDate !== undefined && newChanges.endDate !== oldRental.endDate) {
      console.log("📅 Detectada mudança na data de término");
      
      const startDate = new Date((newChanges.startDate ?? oldRental.startDate) + "T00:00:00");
      const oldEndDate = oldRental.endDate ? new Date(oldRental.endDate + "T00:00:00") : null;
      const newEndDate = newChanges.endDate ? new Date(newChanges.endDate + "T00:00:00") : null;
      const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;
      const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;

      if (newEndDate && oldEndDate) {
        // CENÁRIO: Extensão do contrato (nova data final é POSTERIOR à antiga)
        if (newEndDate > oldEndDate) {
          console.log("📈 EXTENSÃO DE CONTRATO DETECTADA!");
          console.log(`   - Data final antiga: ${oldEndDate.toISOString().split('T')[0]}`);
          console.log(`   - Data final nova: ${newEndDate.toISOString().split('T')[0]}`);
          
          // Buscar o último pagamento do período antigo
          const { data: lastOldPayment } = await supabase
            .from("payments")
            .select("*")
            .eq("rental_id", rentalId)
            .order("reference_year", { ascending: false })
            .order("reference_month", { ascending: false })
            .limit(1)
            .single();

          if (lastOldPayment) {
            const lastMonth = Number(lastOldPayment.reference_month);
            const lastYear = Number(lastOldPayment.reference_year);
            const lastDayOfMonth = new Date(lastYear, lastMonth, 0).getDate();
            const oldEndDay = oldEndDate.getDate();
            
            // Verificar se o último pagamento era proporcional (não cobrava mês completo)
            const wasProportional = oldEndDay < lastDayOfMonth;
            
            if (wasProportional) {
              console.log("🔄 Último pagamento anterior era PROPORCIONAL - atualizando para INTEGRAL");
              
              // Atualizar para valor integral
              const integralBreakdown = [
                {
                  description: "Aluguel",
                  amount: parseFloat(monthlyRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (garageAmount > 0) {
                integralBreakdown.push({
                  description: "Garagem",
                  amount: parseFloat(garageAmount.toFixed(2)),
                  type: "addition",
                });
              }

              await supabase
                .from("payments")
                .update({
                  expected_amount: totalMonthlyRent,
                  breakdown: integralBreakdown,
                })
                .eq("id", lastOldPayment.id);

              console.log(`✅ Pagamento ${lastMonth}/${lastYear} atualizado de proporcional para integral: R$ ${totalMonthlyRent.toFixed(2)}`);
            }
          }

          // Gerar novos pagamentos para o período estendido
          console.log("📝 Gerando novos pagamentos para o período estendido...");
          
          // Calcular primeiro mês do período novo (mês seguinte ao último pagamento existente)
          const { data: allExistingPayments } = await supabase
            .from("payments")
            .select("reference_month, reference_year")
            .eq("rental_id", rentalId)
            .order("reference_year", { ascending: false })
            .order("reference_month", { ascending: false });

          const existingRefs = new Set(
            (allExistingPayments || []).map(p => `${p.reference_year}-${p.reference_month}`)
          );

          // Gerar novos pagamentos
          const newPayments = [];
          const currentDate = new Date(startDate);
          
          // Encontrar o primeiro mês que ainda não tem pagamento
          while (currentDate <= newEndDate) {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const refKey = `${year}-${month}`;
            
            if (!existingRefs.has(refKey)) {
              const dueDate = new Date(year, month - 1, paymentDay);
              const isLastMonth = (year === newEndDate.getFullYear() && month === newEndDate.getMonth() + 1);
              
              if (isLastMonth) {
                // Último mês - pode ser proporcional
                const endDay = newEndDate.getDate();
                const daysInMonth = new Date(year, month, 0).getDate();
                const isProportional = endDay < daysInMonth;
                
                if (isProportional) {
                  const proportionalRent = (monthlyRent / 30) * endDay;
                  const proportionalGarage = garageAmount > 0 ? (garageAmount / 30) * endDay : 0;
                  const proportionalTotal = proportionalRent + proportionalGarage;
                  
                  const breakdown = [
                    {
                      description: `Aluguel - Última Parcela (${endDay} dias)`,
                      amount: parseFloat(proportionalRent.toFixed(2)),
                      type: "addition",
                    }
                  ];

                  if (garageAmount > 0) {
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
                } else {
                  // Último mês integral
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
                }
              } else {
                // Mês intermediário - sempre integral
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
              }
            }
            
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          if (newPayments.length > 0) {
            const { error: insertError } = await supabase
              .from("payments")
              .insert(newPayments);

            if (insertError) {
              console.error("❌ Erro ao inserir novos pagamentos:", insertError);
            } else {
              console.log(`✅ ${newPayments.length} novos pagamentos criados para o período estendido`);
            }
          }

          // Atualizar total_installments de todos os pagamentos
          const { data: allPayments } = await supabase
            .from("payments")
            .select("id")
            .eq("rental_id", rentalId);

          const totalInstallments = (allPayments || []).length;

          await supabase
            .from("payments")
            .update({ total_installments: totalInstallments })
            .eq("rental_id", rentalId);

          console.log(`✅ Total de parcelas atualizado: ${totalInstallments}`);
        } else {
          // CENÁRIO: Redução do contrato (nova data final é ANTERIOR à antiga)
          console.log("📉 REDUÇÃO DE CONTRATO DETECTADA");
          // Lógica existente...
        }
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
      
      const newMonthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const newGarageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const newTotalRent = newMonthlyRent + newGarageAmount;
      
      // Atualizar todos os recebimentos pendentes (exceto proporcionais que já foram tratados)
      for (const payment of pendingPayments) {
        const isProporcional = payment.installment === null || 
          (payment.total_installments && payment.installment === payment.total_installments + 1) ||
          payment.installment === 1;
        
        // Não atualizar proporcionais se já foram atualizados acima
        const alreadyUpdated = updates.find(u => u.id === payment.id);
        if (alreadyUpdated) {
          continue;
        }
        
        // Para parcelas normais (não proporcionais), atualizar valor
        if (!isProporcional) {
          updates.push({
            id: payment.id,
            changes: {
              expected_amount: newTotalRent,
            }
          });
          
          console.log(`✅ Parcela ${payment.installment}: Novo valor R$ ${newTotalRent.toFixed(2)}`);
        }
      }
    }

    // 4. MUDANÇA NO DIA DE PAGAMENTO
    if (newChanges.paymentDay !== undefined && newChanges.paymentDay !== oldRental.paymentDay) {
      console.log("📆 Detectada mudança no dia de pagamento");
      
      const oldPaymentDay = oldRental.paymentDay;
      const newPaymentDay = newChanges.paymentDay;
      const daysDifference = Math.abs(newPaymentDay - oldPaymentDay);
      
      console.log(`📊 Mudança de vencimento: Dia ${oldPaymentDay} → Dia ${newPaymentDay} (${daysDifference} dias de diferença)`);
      
      const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;
      
      // Calcular o valor proporcional dos dias extras
      const extraDaysValue = calculateProportionalAmount(totalMonthlyRent, daysDifference);
      
      console.log(`💰 Valor dos ${daysDifference} dias extras: R$ ${extraDaysValue.toFixed(2)}`);
      
      // Atualizar o primeiro recebimento pendente com a cobrança dos dias extras
      const firstPendingPayment = pendingPayments[0];
      
      if (firstPendingPayment) {
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
            label: `Aluguel ${capitalizedMonth}/${referenceYear}`,
            value: totalMonthlyRent
          },
          {
            label: "Mudança data de vencimento",
            value: 0,
            description: `De dia ${oldPaymentDay} para dia ${newPaymentDay} (${daysDifference} dias extras)`,
            extraValue: extraDaysValue
          }
        ];
        
        const newExpectedAmount = totalMonthlyRent + extraDaysValue;
        
        updates.push({
          id: firstPendingPayment.id,
          changes: {
            due_date: newDueDate,
            expected_amount: newExpectedAmount,
            breakdown: breakdown,
          }
        });
        
        console.log(`✅ Primeiro recebimento pendente atualizado:`);
        console.log(`   - Nova data: ${newDueDate}`);
        console.log(`   - Novo valor: R$ ${newExpectedAmount.toFixed(2)}`);
        console.log(`   - Breakdown com ${daysDifference} dias extras`);
      }
      
      // Atualizar due_date dos demais recebimentos pendentes (sem cobrar dias extras)
      for (let i = 1; i < pendingPayments.length; i++) {
        const payment = pendingPayments[i];
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
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("payments")
          .update(update.changes)
          .eq("id", update.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar recebimento ${update.id}:`, updateError);
        } else {
          console.log(`✅ Recebimento ${update.id} atualizado com sucesso`);
        }
      }
      
      console.log("✅ Todas as atualizações foram aplicadas com sucesso!");
    } else {
      console.log("ℹ️ Nenhuma atualização necessária nos recebimentos");
    }
  }
};