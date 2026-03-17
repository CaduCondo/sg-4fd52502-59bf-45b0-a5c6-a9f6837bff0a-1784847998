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
      const endDate = newChanges.endDate ? new Date(newChanges.endDate + "T00:00:00") : null;
      const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;
      const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
      const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) 
        ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) 
        : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;

      if (endDate) {
        // Calcular novo total de parcelas
        const newTotalInstallments = getMonthsBetween(startDate, endDate);
        
        // Verificar se última parcela é proporcional
        const isLastProportional = !isEndOfMonth(endDate, paymentDay);
        
        if (isLastProportional) {
          // Buscar última parcela
          const lastPayment = payments.find(p => 
            p.installment === payments.length || 
            (p.total_installments && p.installment === p.total_installments + 1)
          );
          
          if (lastPayment && (lastPayment.status === "pending" || lastPayment.status === "overdue")) {
            // Calcular data de vencimento da última parcela
            const lastDueDate = new Date(endDate);
            lastDueDate.setDate(paymentDay);
            if (lastDueDate < endDate) {
              lastDueDate.setMonth(lastDueDate.getMonth() + 1);
            }
            
            // Calcular início do último período
            const lastPeriodStart = new Date(endDate.getFullYear(), endDate.getMonth(), paymentDay);
            const days = getDaysBetween(lastPeriodStart, endDate);
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
      
      // Atualizar due_date de todos os recebimentos pendentes
      for (const payment of pendingPayments) {
        const newDueDate = calculateDueDate(
          Number(payment.reference_month), 
          Number(payment.reference_year), 
          newChanges.paymentDay
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
        
        console.log(`✅ Parcela ${payment.installment}: Nova data ${newDueDate}`);
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