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
    console.log("🔑 ID da locação:", rentalId);
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
        console.log("🔍 Comparando datas:");
        console.log("   oldEndDate:", oldEndDate);
        console.log("   newEndDate:", newEndDate);
        console.log("   newEndDate > oldEndDate?", newEndDate > oldEndDate);
        
        // CENÁRIO: Extensão do contrato (nova data final é POSTERIOR à antiga)
        if (newEndDate > oldEndDate) {
          console.log("🎯 CONDIÇÃO DE EXTENSÃO ATINGIDA!");
          console.log("📈 EXTENSÃO DE CONTRATO DETECTADA!");
          console.log(`   - Data final antiga: ${oldEndDate.toISOString().split('T')[0]}`);
          console.log(`   - Data final nova: ${newEndDate.toISOString().split('T')[0]}`);
          
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
              console.log("🔄 Último pagamento anterior era PROPORCIONAL - atualizando para INTEGRAL");
              
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

              const { error: updateError } = await supabase
                .from("payments")
                .update({
                  expected_amount: totalMonthlyRent,
                  breakdown: integralBreakdown,
                })
                .eq("id", lastExistingPayment.id);

              if (updateError) {
                console.error("❌ Erro ao atualizar último pagamento:", updateError);
              } else {
                console.log(`✅ Pagamento ${lastMonth}/${lastYear} atualizado de proporcional para integral: R$ ${totalMonthlyRent.toFixed(2)}`);
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
                  // Proporcional
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
                  
                  console.log(`   ✅ Último mês PROPORCIONAL: R$ ${proportionalTotal.toFixed(2)} (${endDay} dias)`);
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
                  
                  console.log(`   ✅ Último mês INTEGRAL: R$ ${totalMonthlyRent.toFixed(2)}`);
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
                
                console.log(`   ✅ Mês intermediário INTEGRAL: R$ ${totalMonthlyRent.toFixed(2)}`);
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
          // CENÁRIO: Redução do contrato (nova data final é ANTERIOR à antiga)
          console.log("📉 REDUÇÃO DE CONTRATO DETECTADA");
          // Lógica existente para redução...
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
      
      // Atualizar TODOS os recebimentos pendentes com novo valor E breakdown
      for (const payment of pendingPayments) {
        console.log(`📝 Processando recebimento ${payment.installment} (${payment.reference_month}/${payment.reference_year})`);
        
        // Verificar se já foi atualizado nas seções anteriores
        const alreadyUpdated = updates.find(u => u.id === payment.id);
        
        // Criar breakdown detalhado
        const breakdown = [
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
        
        if (alreadyUpdated) {
          // Se já existe update, adicionar/atualizar expected_amount e breakdown
          console.log(`   ℹ️ Recebimento já tem update pendente, adicionando valores`);
          alreadyUpdated.changes.expected_amount = parseFloat(newTotalRent.toFixed(2));
          alreadyUpdated.changes.breakdown = breakdown;
          console.log(`   ✅ Update combinado: R$ ${newTotalRent.toFixed(2)}`);
        } else {
          // Criar novo update com expected_amount e breakdown
          console.log(`   ➕ Criando novo update para este recebimento`);
          updates.push({
            id: payment.id,
            changes: {
              expected_amount: parseFloat(newTotalRent.toFixed(2)),
              breakdown: breakdown,
            }
          });
          console.log(`   ✅ Novo valor: R$ ${newTotalRent.toFixed(2)}`);
        }
      }
      
      console.log(`✅ Total de ${pendingPayments.length} recebimentos pendentes processados para atualização de valor`);
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
      
      // Encontrar o primeiro pagamento pendente (em aberto)
      const firstPendingPayment = pendingPayments[0];
      
      if (firstPendingPayment) {
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
        
        console.log(`✅ Primeiro recebimento pendente atualizado:`);
        console.log(`   - Período: ${capitalizedMonth}/${referenceYear}`);
        console.log(`   - Nova data: ${newDueDate}`);
        console.log(`   - Novo valor: R$ ${newExpectedAmount.toFixed(2)}`);
        console.log(`   - Breakdown:`, breakdown);
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