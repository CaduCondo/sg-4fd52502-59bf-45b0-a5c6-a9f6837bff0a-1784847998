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
    referenceMonth: data.reference_month,
    referenceYear: data.reference_year,
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
  if (data.referenceMonth) dbData.reference_month = data.referenceMonth;
  if (data.referenceYear) dbData.reference_year = data.referenceYear;
  if (data.receiptUrl) dbData.receipt_url = data.receiptUrl;
  if (data.penaltyAmount) dbData.penalty_amount = data.penaltyAmount;
  if (data.interestAmount) dbData.interest_amount = data.interestAmount;
  if (data.discountAmount) dbData.discount_amount = data.discountAmount;

  // Cleanup camelCase keys if needed, but Supabase ignores unknown columns mostly
  // Removing strictly to be clean would require omitting keys
  
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

// Alias
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

// Alias
export const getById = getPaymentById;

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  const dbData = mapPaymentToDB(data);
  const result = await createSingle<any>(TABLE, dbData);
  return mapPaymentFromDB(result);
}

// Alias
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

// Alias
export const update = updatePayment;

export async function deletePayment(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deletePayment;

export async function getPaymentsByRentalId(rentalId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq('rental_id', rentalId);
    
  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
}

// Alias
export const getByRentalId = getPaymentsByRentalId;

export async function deletePendingPaymentsByRentalId(rentalId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('rental_id', rentalId)
    .eq('status', 'pending');

  if (error) throw error;
}

// Alias
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

// Alias
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

// Métodos complexos de atualização em lote
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

export async function createPaymentsForRental(rental: any): Promise<void> {
  console.log("=== INICIO createPaymentsForRental ===");
  console.log("Rental recebido:", rental);
  
  const startDate = new Date(rental.startDate || rental.start_date);
  const endDate = rental.endDate || rental.end_date 
    ? new Date(rental.endDate || rental.end_date) 
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  const paymentDay = rental.paymentDay || rental.payment_day;
  const monthlyValue = rental.value || rental.monthly_rent;

  console.log("Dados processados:", {
    rentalId: rental.id,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    paymentDay,
    monthlyValue
  });

  // Verificar se a primeira parcela deve ser proporcional
  const isProportional = shouldUseProportionalRent(
    startDate.toISOString().split('T')[0],
    paymentDay
  );

  let firstPaymentValue = monthlyValue;
  let firstPaymentDays = 30;

  if (isProportional) {
    const startDateStr = startDate.toISOString().split('T')[0];
    
    firstPaymentDays = calculateDaysBetweenDates(
      startDateStr,
      paymentDay
    );
    
    firstPaymentValue = calculateProportionalRent(
      monthlyValue, 
      startDateStr,
      paymentDay
    );
    
    console.log("🔄 Primeira parcela PROPORCIONAL:", {
      dias: firstPaymentDays,
      valorMensal: monthlyValue,
      valorProporcional: firstPaymentValue,
      calculo: `(${monthlyValue} / 30) × ${firstPaymentDays} = ${firstPaymentValue}`
    });
  } else {
    console.log("✅ Primeira parcela INTEGRAL (30 dias):", {
      valorMensal: monthlyValue
    });
  }

  const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthsDiff = endDate.getMonth() - startDate.getMonth();
  const totalMonths = (yearsDiff * 12) + monthsDiff + 1;

  const payments = [];

  for (let i = 0; i < totalMonths; i++) {
    const referenceDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    
    let dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), paymentDay);
    
    if (dueDate.getMonth() !== referenceDate.getMonth()) {
      dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    }

    // Primeira parcela: usar valor proporcional se aplicável
    // Demais parcelas: usar valor integral
    const expectedAmount = (i === 0 && isProportional) ? firstPaymentValue : monthlyValue;

    payments.push({
      rental_id: rental.id,
      due_date: dueDate.toISOString().split('T')[0],
      expected_amount: expectedAmount,
      status: 'pending',
      reference_month: (referenceDate.getMonth() + 1),
      reference_year: referenceDate.getFullYear(),
    });
  }

  console.log(`Preparando para criar ${payments.length} pagamentos:`, payments);

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payments)
    .select();

  if (error) {
    console.error("ERRO ao criar pagamentos:", error);
    throw error;
  }

  console.log(`✅ Sucesso! Criados ${data?.length || 0} pagamentos`);
  if (isProportional) {
    console.log(`   - 1ª parcela proporcional: R$ ${firstPaymentValue.toFixed(2)} (${firstPaymentDays} dias)`);
    console.log(`   - Demais parcelas: R$ ${monthlyValue.toFixed(2)} (valor integral)`);
  }
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
    // 1. Buscar todas as locações ativas
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

    // 2. Para cada locação, verificar e corrigir primeira parcela
    for (const rental of rentals) {
      result.processed++;
      
      try {
        const startDate = rental.start_date;
        const paymentDay = rental.payment_day;
        const monthlyValue = rental.value || rental.monthly_rent || 0;

        console.log(`\n🔍 Processando locação ID: ${rental.id}`);
        console.log(`   - Data início: ${startDate}`);
        console.log(`   - Dia vencimento: ${paymentDay}`);
        console.log(`   - Valor mensal: R$ ${monthlyValue}`);

        // Verificar se deve usar valor proporcional
        const isProportional = shouldUseProportionalRent(startDate, paymentDay);

        if (!isProportional) {
          console.log(`   ✅ Primeira parcela já é integral (não precisa correção)`);
          continue;
        }

        // Calcular valor proporcional correto
        const days = calculateDaysBetweenDates(startDate, paymentDay);
        const proportionalValue = calculateProportionalRent(
          monthlyValue,
          startDate,
          paymentDay
        );

        console.log(`   🔄 Deve ser proporcional:`);
        console.log(`      - Dias: ${days}`);
        console.log(`      - Valor correto: R$ ${proportionalValue.toFixed(2)}`);

        // Buscar a primeira parcela desta locação
        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("rental_id", rental.id)
          .order("due_date", { ascending: true })
          .limit(1);

        if (paymentsError) {
          console.error(`   ❌ Erro ao buscar pagamentos:`, paymentsError);
          result.errors.push(`Locação ${rental.id}: ${paymentsError.message}`);
          continue;
        }

        if (!payments || payments.length === 0) {
          console.log(`   ⚠️ Nenhum pagamento encontrado`);
          continue;
        }

        const firstPayment = payments[0];
        const currentValue = firstPayment.expected_amount;

        console.log(`   📊 Primeira parcela atual: R$ ${currentValue}`);

        // Verificar se precisa atualizar
        if (Math.abs(currentValue - proportionalValue) < 0.01) {
          console.log(`   ✅ Valor já está correto (diferença < R$ 0,01)`);
          continue;
        }

        // Atualizar o valor da primeira parcela
        const { error: updateError } = await supabase
          .from("payments")
          .update({ expected_amount: proportionalValue })
          .eq("id", firstPayment.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar pagamento:`, updateError);
          result.errors.push(`Pagamento ${firstPayment.id}: ${updateError.message}`);
          continue;
        }

        result.updated++;
        console.log(`   ✅ ATUALIZADO! R$ ${currentValue.toFixed(2)} → R$ ${proportionalValue.toFixed(2)}`);

      } catch (error: any) {
        console.error(`   ❌ Erro ao processar locação ${rental.id}:`, error);
        result.errors.push(`Locação ${rental.id}: ${error.message}`);
      }
    }

    console.log("\n=== RESUMO DA MIGRAÇÃO ===");
    console.log(`✅ Processadas: ${result.processed} locações`);
    console.log(`✅ Atualizadas: ${result.updated} primeiras parcelas`);
    console.log(`❌ Erros: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log("\n📋 Detalhes dos erros:");
      result.errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log("=== FIM MIGRAÇÃO ===");

  } catch (error: any) {
    console.error("❌ Erro crítico na migração:", error);
    result.success = false;
    result.errors.push(`Erro crítico: ${error.message}`);
  }

  return result;
}