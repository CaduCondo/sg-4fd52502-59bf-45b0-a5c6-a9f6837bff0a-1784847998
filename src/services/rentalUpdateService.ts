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
  effectiveDate: string;
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
 * 
 * REGRA CRÍTICA: Atualiza APENAS pagamentos FUTUROS (due_date >= hoje) e status = 'pending'
 * NUNCA toca em pagamentos PAGOS ou PASSADOS
 */
async function adjustRentalValue(adjustment: RentValueAdjustment): Promise<void> {
  console.log("💰 [adjustRentalValue] Iniciando ajuste de valor do aluguel...");
  console.log("📋 Dados do ajuste:", adjustment);

  const { rentalId, oldValue, newValue, effectiveDate } = adjustment;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .single();

  if (rentalError || !rental) {
    console.error("❌ Erro ao buscar locação:", rentalError);
    throw new Error("Locação não encontrada");
  }

  // ✅ CRÍTICO: Buscar APENAS pagamentos FUTUROS e PENDING
  const { data: futurePayments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .gte("due_date", todayStr)  // ← APENAS due_date >= hoje
    .order("due_date", { ascending: true });

  if (paymentsError) throw paymentsError;
  if (!futurePayments || futurePayments.length === 0) {
    console.log("ℹ️ Nenhum pagamento futuro pendente para atualizar");
    return;
  }

  console.log(`📊 ${futurePayments.length} pagamentos futuros serão atualizados`);

  const garageAmount = (rental.has_garage && rental.garage_value) ? rental.garage_value : 0;
  const totalNewValue = newValue + garageAmount;

  const updates: Array<{ id: string; changes: any }> = [];

  for (const payment of futurePayments) {
    const breakdown = [{ type: "addition", amount: parseFloat(newValue.toFixed(2)), description: "Aluguel" }];
    if (garageAmount > 0) {
      breakdown.push({ type: "addition", amount: parseFloat(garageAmount.toFixed(2)), description: "Garagem" });
    }
    updates.push({ 
      id: payment.id, 
      changes: { 
        expected_amount: parseFloat(totalNewValue.toFixed(2)), 
        breakdown 
      } 
    });
  }

  for (const update of updates) {
    const { error: updateError } = await supabase.from("payments").update(update.changes).eq("id", update.id);
    if (updateError) throw updateError;
  }

  console.log(`✅ ${updates.length} pagamentos futuros atualizados com sucesso`);
}

function getDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateProportionalAmount(monthlyRent: number, days: number): number {
  return Number(((monthlyRent / 30) * days).toFixed(2));
}

function calculateDueDate(referenceMonth: number, referenceYear: number, paymentDay: number): string {
  return new Date(referenceYear, referenceMonth - 1, paymentDay).toISOString().split('T')[0];
}

function getMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  return months + 1;
}

function isEndOfMonth(date: Date, paymentDay: number): boolean {
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const expectedEndDay = paymentDay - 1;
  return date.getDate() === (expectedEndDay === 0 ? lastDayOfMonth : expectedEndDay);
}

export const rentalUpdateService = {
  adjustRentalValue,

  async updatePaymentsOnRentalEdit(rentalId: string, oldRental: Rental, newChanges: RentalUpdateChanges): Promise<void> {
    try {
      console.log("🚀 [rentalUpdateService] Iniciando análise...");
      console.log("📋 Old:", oldRental.startDate, "New:", newChanges.startDate);

      const { data: payments, error } = await supabase
        .from("payments")
        .select("*")
        .eq("rental_id", rentalId)
        .order("reference_year", { ascending: true })
        .order("reference_month", { ascending: true });

      if (error) throw error;
      if (!payments || payments.length === 0) {
        console.log("ℹ️ Nenhum recebimento encontrado");
        return;
      }

      const pendingPayments = payments.filter(p => p.status === "pending" || p.status === "overdue") as PaymentToUpdate[];
      const updates: Array<{ id: string; changes: any }> = [];

      // 1. MUDANÇA NA DATA DE INÍCIO
      if (newChanges.startDate && newChanges.startDate !== oldRental.startDate) {
        console.log("📅 DETECTADA MUDANÇA NA DATA DE INÍCIO!");
        
        const oldStartDate = new Date(oldRental.startDate + "T00:00:00");
        const newStartDate = new Date(newChanges.startDate + "T00:00:00");
        const paymentDay = newChanges.paymentDay ?? oldRental.paymentDay;
        const monthlyRent = newChanges.monthlyRent ?? oldRental.monthlyRent;
        const garageAmount = (newChanges.hasGarage ?? oldRental.hasGarage) ? (newChanges.garageValue ?? oldRental.garageValue ?? 0) : 0;
        const totalMonthlyRent = monthlyRent + garageAmount;

        if (newStartDate < oldStartDate) {
          console.log("🔙 DATA ANTECIPADA - criando recebimentos faltantes...");
          
          const { data: existingPayments } = await supabase
            .from("payments")
            .select("reference_month, reference_year")
            .eq("rental_id", rentalId);

          const existingRefs = new Set((existingPayments || []).map(p => `${p.reference_year}-${p.reference_month}`));
          
          const startDay = newStartDate.getDate();
          const startMonth = newStartDate.getMonth() + 1;
          const startYear = newStartDate.getFullYear();
          
          let firstPaymentMonth: number, firstPaymentYear: number, firstPaymentDays: number;
          
          if (startDay === paymentDay) {
            firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
            firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
            firstPaymentDays = 30;
          } else if (startDay < paymentDay) {
            firstPaymentMonth = startMonth;
            firstPaymentYear = startYear;
            firstPaymentDays = paymentDay - startDay;
          } else {
            firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
            firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
            const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
            firstPaymentDays = (daysInStartMonth - startDay + 1) + (paymentDay - 1);
          }

          const newPayments = [];
          const currentDate = new Date(firstPaymentYear, firstPaymentMonth - 1, 1);
          
          let stopBeforeMonth: number | null = null, stopBeforeYear: number | null = null;
          if (existingPayments && existingPayments.length > 0) {
            const sorted = existingPayments.map(p => ({ month: Number(p.reference_month), year: Number(p.reference_year) }))
              .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
            stopBeforeMonth = sorted[0].month;
            stopBeforeYear = sorted[0].year;
          }

          let monthCount = 0;
          while (true) {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            
            if (stopBeforeMonth && stopBeforeYear && (year > stopBeforeYear || (year === stopBeforeYear && month >= stopBeforeMonth))) break;
            
            const refKey = `${year}-${month}`;
            if (!existingRefs.has(refKey)) {
              monthCount++;
              const dueDate = new Date(year, month - 1, paymentDay);
              const isFirstPayment = (year === firstPaymentYear && month === firstPaymentMonth);
              
              if (isFirstPayment && firstPaymentDays !== 30) {
                const proportionalRent = (monthlyRent / 30) * firstPaymentDays;
                const proportionalGarage = garageAmount > 0 ? (garageAmount / 30) * firstPaymentDays : 0;
                const proportionalTotal = proportionalRent + proportionalGarage;
                
                const breakdown = [{ description: `Aluguel - Primeira Parcela (${firstPaymentDays} dias)`, amount: parseFloat(proportionalRent.toFixed(2)), type: "addition" }];
                if (garageAmount > 0) breakdown.push({ description: `Garagem (${firstPaymentDays} dias)`, amount: parseFloat(proportionalGarage.toFixed(2)), type: "addition" });

                newPayments.push({
                  rental_id: rentalId,
                  reference_month: month.toString(),
                  reference_year: year.toString(),
                  due_date: dueDate.toISOString().split('T')[0],
                  expected_amount: parseFloat(proportionalTotal.toFixed(2)),
                  status: "pending",
                  breakdown
                });
              } else {
                const breakdown = [{ description: "Aluguel", amount: parseFloat(monthlyRent.toFixed(2)), type: "addition" }];
                if (garageAmount > 0) breakdown.push({ description: "Garagem", amount: parseFloat(garageAmount.toFixed(2)), type: "addition" });

                newPayments.push({
                  rental_id: rentalId,
                  reference_month: month.toString(),
                  reference_year: year.toString(),
                  due_date: dueDate.toISOString().split('T')[0],
                  expected_amount: totalMonthlyRent,
                  status: "pending",
                  breakdown
                });
              }
            }
            
            currentDate.setMonth(currentDate.getMonth() + 1);
            if (monthCount > 100) break;
          }

          if (newPayments.length > 0) {
            const { error: insertError } = await supabase.from("payments").insert(newPayments);
            if (insertError) throw insertError;
            
            const { data: allPaymentsAfter } = await supabase.from("payments").select("id").eq("rental_id", rentalId);
            await supabase.from("payments").update({ total_installments: (allPaymentsAfter || []).length }).eq("rental_id", rentalId);
          }

          if (stopBeforeMonth && stopBeforeYear) {
            const firstExisting = payments.find(p => `${p.reference_year}-${p.reference_month}` === `${stopBeforeYear}-${stopBeforeMonth}` && (p.status === "pending" || p.status === "overdue"));
            if (firstExisting) {
              const shouldBeIntegral = !(stopBeforeMonth === firstPaymentMonth && stopBeforeYear === firstPaymentYear);
              if (shouldBeIntegral && firstExisting.expected_amount !== totalMonthlyRent) {
                const breakdown = [{ description: "Aluguel", amount: parseFloat(monthlyRent.toFixed(2)), type: "addition" }];
                if (garageAmount > 0) breakdown.push({ description: "Garagem", amount: parseFloat(garageAmount.toFixed(2)), type: "addition" });
                updates.push({ id: firstExisting.id, changes: { expected_amount: totalMonthlyRent, breakdown } });
              }
            }
          }
        } else if (newStartDate > oldStartDate) {
          console.log("⏩ DATA POSTERGADA - atualizando primeiro pagamento...");
          const firstPayment = payments.find(p => p.installment === null || p.installment === 1);
          if (firstPayment && (firstPayment.status === "pending" || firstPayment.status === "overdue")) {
            const startDay = newStartDate.getDate();
            const startMonth = newStartDate.getMonth() + 1;
            const startYear = newStartDate.getFullYear();
            let firstPaymentMonth: number, firstPaymentYear: number, daysToCharge: number;
            
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
              daysToCharge = (daysInStartMonth - startDay + 1) + (paymentDay - 1);
            }

            const newDueDate = new Date(firstPaymentYear, firstPaymentMonth - 1, paymentDay);
            updates.push({
              id: firstPayment.id,
              changes: {
                due_date: newDueDate.toISOString().split('T')[0],
                expected_amount: daysToCharge !== 30 ? calculateProportionalAmount(totalMonthlyRent, daysToCharge) : totalMonthlyRent
              }
            });
          }
        }
      }

      // Aplicar updates
      if (updates.length > 0) {
        for (const update of updates) {
          await supabase.from("payments").update(update.changes).eq("id", update.id);
        }
      }
    } catch (error) {
      console.error("❌ ERRO CRÍTICO:", error);
      throw error;
    }
  }
};