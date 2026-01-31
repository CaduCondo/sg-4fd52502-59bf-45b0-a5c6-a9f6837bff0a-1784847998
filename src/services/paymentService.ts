import { Payment } from "@/types";
import { 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle
} from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateDaysBetweenDates,
  calculateProportionalRent,
  shouldUseProportionalRent
} from "@/lib/rentalCalculations";

const TABLE = "payments";

// Mapper function to convert DB snake_case to Frontend camelCase
function mapPaymentFromDB(data: any): Payment {
  return {
    ...data,
    rentalId: data.rental_id,
    dueDate: data.due_date,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    paymentDate: data.payment_date,
    paymentMethod: data.payment_method,
    referenceMonth: data.reference_month ? parseInt(data.reference_month) : undefined,
    referenceYear: data.reference_year ? parseInt(data.reference_year) : undefined,
    receiptUrl: data.receipt_url,
    penaltyAmount: data.penalty_amount,
    interestAmount: data.interest_amount,
    discountAmount: data.discount_amount,
    
    // Compatibility fields
    paymentCode: data.payment_code,
    lateFee: data.late_fee,
    interest: data.interest,
    paymentLocation: data.payment_location,
  };
}

// Reverse mapper for writes (camelCase -> snake_case)
function mapPaymentToDB(data: Partial<Payment>): any {
  const dbData: any = { ...data };
  
  if (data.rentalId) dbData.rental_id = data.rentalId;
  if (data.dueDate) dbData.due_date = data.dueDate;
  if (data.expectedAmount) dbData.expected_amount = data.expectedAmount;
  if (data.paidAmount) dbData.paid_amount = data.paidAmount;
  if (data.paymentDate) dbData.payment_date = data.paymentDate;
  if (data.paymentMethod) dbData.payment_method = data.paymentMethod;
  if (data.referenceMonth !== undefined) dbData.reference_month = data.referenceMonth;
  if (data.referenceYear !== undefined) dbData.reference_year = data.referenceYear;
  if (data.receiptUrl) dbData.receipt_url = data.receiptUrl;
  if (data.penaltyAmount) dbData.penalty_amount = data.penaltyAmount;
  if (data.interestAmount) dbData.interest_amount = data.interestAmount;
  if (data.discountAmount) dbData.discount_amount = data.discountAmount;

  return dbData;
}

export async function getAll(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }

  return (data || []).map(mapPaymentFromDB);
}

export const getAllPayments = getAll;

export async function getPaymentById(id: string): Promise<Payment> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Pagamento não encontrado");
  
  return mapPaymentFromDB(data);
}

export const getById = getPaymentById;

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  const dbData = mapPaymentToDB(data);
  const result = await createSingle<any>(TABLE, dbData);
  return mapPaymentFromDB(result);
}

export const create = createPayment;

export async function updatePayment(id: string, payment: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .update({
      rental_id: payment.rentalId,
      expected_amount: payment.expectedAmount,
      paid_amount: payment.paidAmount,
      payment_date: payment.paymentDate,
      status: payment.status,
      payment_method: payment.paymentMethod,
      payment_location: payment.paymentLocation,
      payment_code: payment.paymentCode,
      notes: payment.notes,
      reference_month: payment.referenceMonth?.toString(),
      reference_year: payment.referenceYear?.toString(),
      receipt_url: payment.receiptUrl,
      attachments: payment.attachments,
      penalty_amount: payment.penaltyAmount,
      interest_amount: payment.interestAmount,
      discount_amount: payment.discountAmount,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapPaymentFromDB(data);
}

export const update = updatePayment;

export async function deletePayment(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

export const remove = deletePayment;

export async function getPaymentsByRentalId(rentalId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq('rental_id', rentalId);
    
  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
}

export const getByRentalId = getPaymentsByRentalId;

export async function deletePendingPaymentsByRentalId(rentalId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('rental_id', rentalId)
    .eq('status', 'pending');

  if (error) throw error;
}

export const deletePendingByRentalId = deletePendingPaymentsByRentalId;

export async function deleteFuturePaymentsByRentalId(rentalId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('rental_id', rentalId)
    .eq('status', 'pending')
    .gt('due_date', today);

  if (error) throw error;
}

export const deleteFutureByRentalId = deleteFuturePaymentsByRentalId;

export async function updateOverdueStatus(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', today);

  if (error) console.error("Erro ao atualizar status de pagamentos atrasados:", error);
}

export async function updateFuturePaymentsOnRentalValueChange(
  rentalId: string, 
  newAmount: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from(TABLE)
    .update({ expected_amount: newAmount })
    .eq('rental_id', rentalId)
    .eq('status', 'pending')
    .gt('due_date', today);

  if (error) throw error;
}

export async function updateFuturePaymentsOnPaymentDayChange(
  rentalId: string,
  newDay: number
): Promise<void> {
  const { data: payments, error: fetchError } = await supabase
    .from(TABLE)
    .select("*")
    .eq('rental_id', rentalId)
    .in('status', ['pending', 'overdue', 'partial']);

  if (fetchError) throw fetchError;
  if (!payments || payments.length === 0) return;

  for (const payment of payments) {
    const currentDueDate = new Date(payment.due_date + 'T00:00:00');
    const year = currentDueDate.getFullYear();
    const month = currentDueDate.getMonth();
    
    let newDueDate = new Date(year, month, newDay);
    
    if (newDueDate.getMonth() !== month) {
      newDueDate = new Date(year, month + 1, 0);
    }

    await supabase
      .from(TABLE)
      .update({ due_date: newDueDate.toISOString().split('T')[0] })
      .eq('id', payment.id);
  }
}

export async function updateFuturePayments(rentalId: string, newValue: number): Promise<void> {
  const { data: payments, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("rental_id", rentalId)
    .in('status', ['pending', 'overdue', 'partial']);

  if (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }

  if (!payments || payments.length === 0) {
    return;
  }

  for (const payment of payments) {
    await supabase
      .from(TABLE)
      .update({ expected_amount: newValue })
      .eq("id", payment.id);
  }

  console.log(`✅ Atualizados ${payments.length} pagamentos não pagos`);
}

/**
 * FUNÇÃO CORRIGIDA - Cria parcelas de pagamento para uma locação
 * FIX: Evita duplicação de parcelas no mesmo mês
 * FIX: Não cria novos recebimentos se já existem para esta locação
 */
export async function createPaymentsForRental(rental: any): Promise<void> {
  console.log("=== INICIO createPaymentsForRental (VERSÃO CORRIGIDA) ===");
  console.log("Rental recebido:", rental);

  // VERIFICAR SE JÁ EXISTEM RECEBIMENTOS PARA ESTA LOCAÇÃO
  const { data: existingPayments, error: checkError } = await supabase
    .from("payments")
    .select("id")
    .eq("rental_id", rental.id)
    .limit(1);

  if (checkError) {
    console.error("Erro ao verificar recebimentos existentes:", checkError);
    throw checkError;
  }

  if (existingPayments && existingPayments.length > 0) {
    console.log("⚠️ Já existem recebimentos para esta locação. Pulando criação.");
    console.log("💡 Use updateFuturePayments() para atualizar valores.");
    return;
  }
  
  const startDate = new Date(rental.startDate || rental.start_date);
  const endDate = rental.endDate || rental.end_date 
    ? new Date(rental.endDate || rental.end_date) 
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  
  const paymentDay = Number(rental.paymentDay || rental.payment_day);
  const monthlyValue = Number(rental.value || rental.monthly_rent);

  console.log("Dados processados:", {
    rentalId: rental.id,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    paymentDay,
    monthlyValue
  });

  const payments = [];
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // ETAPA 1: Verificar se primeira parcela é proporcional
  const isFirstProportional = shouldUseProportionalRent(startDateStr, paymentDay);

  // Data de referência para começar a iterar
  let currentMonth = startDate.getMonth();
  let currentYear = startDate.getFullYear();

  // ETAPA 2: Primeira parcela (proporcional ou integral)
  if (isFirstProportional) {
    const firstPaymentDays = calculateDaysBetweenDates(startDateStr, paymentDay);
    const firstPaymentValue = calculateProportionalRent(monthlyValue, startDateStr, paymentDay);
    
    // Vencimento da primeira parcela proporcional
    let firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    
    // Se o dia de pagamento já passou no mês atual, vai para próximo mês
    if (firstDueDate <= startDate) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    }
    
    // Ajuste para dias inexistentes
    if (firstDueDate.getMonth() !== currentMonth) {
      firstDueDate = new Date(currentYear, currentMonth + 1, 0);
    }

    payments.push({
      rental_id: rental.id,
      due_date: firstDueDate.toISOString().split('T')[0],
      expected_amount: firstPaymentValue,
      status: 'pending',
      reference_month: currentMonth + 1,
      reference_year: currentYear,
    });

    console.log(`🔄 Primeira parcela PROPORCIONAL: R$ ${firstPaymentValue.toFixed(2)} (${firstPaymentDays} dias) - Venc: ${firstDueDate.toISOString().split('T')[0]}`);

    // Avançar para próximo mês
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  } else {
    // Se não é proporcional, começar do mês da data de início
    const firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    
    // Se o vencimento for antes da data de início, vai para próximo mês
    if (firstDueDate < startDate) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  // ETAPA 3: Parcelas mensais integrais
  // Iterar até chegar na data final do contrato
  while (true) {
    // Criar vencimento para o mês atual
    let dueDate = new Date(currentYear, currentMonth, paymentDay);
    
    // Ajuste para dias inexistentes (ex: 31 de fev vira 28/29)
    if (dueDate.getMonth() !== currentMonth) {
      dueDate = new Date(currentYear, currentMonth + 1, 0);
    }

    // PARAR se ultrapassar data final do contrato
    if (dueDate > endDate) {
      break;
    }

    // Adicionar parcela integral
    payments.push({
      rental_id: rental.id,
      due_date: dueDate.toISOString().split('T')[0],
      expected_amount: monthlyValue,
      status: 'pending',
      reference_month: currentMonth + 1,
      reference_year: currentYear,
    });

    console.log(`✅ Parcela ${payments.length}: R$ ${monthlyValue.toFixed(2)} - Venc: ${dueDate.toISOString().split('T')[0]} (Ref: ${currentMonth + 1}/${currentYear})`);

    // Avançar 1 mês
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  console.log(`📊 Total de parcelas criadas: ${payments.length}`);

  // Inserir todas as parcelas no banco
  const { data, error } = await supabase
    .from("payments")
    .insert(payments)
    .select();

  if (error) {
    console.error("❌ ERRO ao criar pagamentos:", error);
    throw error;
  }

  console.log(`✅ Sucesso! Criados ${data?.length || 0} pagamentos`);
  console.log("=== FIM createPaymentsForRental ===");
}

// Nova função: Migração para corrigir parcelas proporcionais de contratos existentes
export async function migrateProportionalFirstPayments(): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
}> {
  console.log("=== INICIO MIGRAÇÃO PARCELAS PROPORCIONAIS ===");
  
  const result = {
    success: true,
    processed: 0,
    updated: 0,
    errors: [] as string[]
  };

  try {
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("*")
      .eq("is_active", true);

    if (rentalsError) {
      console.error("Erro ao buscar locações:", rentalsError);
      throw rentalsError;
    }

    if (!rentals || rentals.length === 0) {
      console.log("⚠️ Nenhuma locação ativa encontrada");
      return result;
    }

    console.log(`📋 Encontradas ${rentals.length} locações ativas`);

    for (const rental of rentals) {
      result.processed++;
      
      try {
        const startDate = rental.start_date;
        const paymentDay = rental.payment_day;
        const monthlyValue = rental.value || rental.monthly_rent || 0;

        console.log(`\n🔍 Processando locação ID: ${rental.id}`);

        const isProportional = shouldUseProportionalRent(startDate, paymentDay);

        if (!isProportional) {
          console.log(`   ✅ Primeira parcela já é integral`);
          continue;
        }

        const days = calculateDaysBetweenDates(startDate, paymentDay);
        const proportionalValue = calculateProportionalRent(monthlyValue, startDate, paymentDay);

        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("rental_id", rental.id)
          .order("due_date", { ascending: true })
          .limit(1);

        if (paymentsError) {
          result.errors.push(`Locação ${rental.id}: ${paymentsError.message}`);
          continue;
        }

        if (!payments || payments.length === 0) {
          console.log(`   ⚠️ Nenhum pagamento encontrado`);
          continue;
        }

        const firstPayment = payments[0];
        const currentValue = firstPayment.expected_amount;

        if (Math.abs(currentValue - proportionalValue) < 0.01) {
          console.log(`   ✅ Valor já está correto`);
          continue;
        }

        const { error: updateError } = await supabase
          .from("payments")
          .update({ expected_amount: proportionalValue })
          .eq("id", firstPayment.id);

        if (updateError) {
          result.errors.push(`Pagamento ${firstPayment.id}: ${updateError.message}`);
          continue;
        }

        result.updated++;
        console.log(`   ✅ ATUALIZADO! R$ ${currentValue.toFixed(2)} → R$ ${proportionalValue.toFixed(2)}`);

      } catch (error: any) {
        result.errors.push(`Locação ${rental.id}: ${error.message}`);
      }
    }

    console.log("\n=== RESUMO DA MIGRAÇÃO ===");
    console.log(`✅ Processadas: ${result.processed} locações`);
    console.log(`✅ Atualizadas: ${result.updated} primeiras parcelas`);
    console.log(`❌ Erros: ${result.errors.length}`);

  } catch (error: any) {
    result.success = false;
    result.errors.push(`Erro crítico: ${error.message}`);
  }

  return result;
}