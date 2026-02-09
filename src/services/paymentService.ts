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

  // Verificar se é pagamento de rescisão e processar finalização
  if (payment.status === "paid") {
    await checkAndProcessTerminationPayment(id);
  }

  return mapPaymentFromDB(data);
}

export const update = updatePayment;

export async function deletePayment(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

export const remove = deletePayment;

/**
 * Verifica se um pagamento é de rescisão e processa finalização da locação
 * quando for marcado como pago
 */
async function checkAndProcessTerminationPayment(paymentId: string): Promise<void> {
  console.log("🔍 Verificando se pagamento é de rescisão:", paymentId);

  // Buscar o pagamento
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*, rental:rentals!payments_rental_id_fkey(*)")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    console.log("❌ Erro ao buscar pagamento:", paymentError);
    return;
  }

  // Verificar se é um pagamento de rescisão (tem a palavra "Rescisão" no notes)
  const isTerminationPayment = payment.notes?.includes("Rescisão de Contrato");
  
  if (!isTerminationPayment) {
    console.log("ℹ️ Pagamento não é de rescisão");
    return;
  }

  console.log("✅ Pagamento de rescisão detectado! Processando finalização...");

  const rental = payment.rental;
  if (!rental) {
    console.log("❌ Locação não encontrada");
    return;
  }

  // PASSO 1: Atualizar status da propriedade para "available"
  console.log("🏠 Atualizando propriedade para disponível...");
  const { error: propertyError } = await supabase
    .from("properties")
    .update({ status: "available" })
    .eq("id", rental.property_id);

  if (propertyError) {
    console.error("❌ Erro ao atualizar propriedade:", propertyError);
  } else {
    console.log("✅ Propriedade atualizada para: available");
  }

  // PASSO 2: Verificar se inquilino tem outras locações ativas
  const { data: otherRentals, error: otherRentalsError } = await supabase
    .from("rentals")
    .select("id")
    .eq("tenant_id", rental.tenant_id)
    .eq("status", "active")
    .neq("id", rental.id);

  if (otherRentalsError) {
    console.error("❌ Erro ao verificar outras locações:", otherRentalsError);
  }

  // Se não tem outras locações ativas, atualiza inquilino para inactive
  const newTenantStatus = (!otherRentals || otherRentals.length === 0) ? "inactive" : "active";
  
  console.log(`👤 Atualizando inquilino para: ${newTenantStatus}`);
  const { error: tenantError } = await supabase
    .from("tenants")
    .update({ status: newTenantStatus })
    .eq("id", rental.tenant_id);

  if (tenantError) {
    console.error("❌ Erro ao atualizar inquilino:", tenantError);
  } else {
    console.log(`✅ Inquilino atualizado para: ${newTenantStatus}`);
  }

  // PASSO 3: Atualizar status da locação para "terminated"
  console.log("📋 Atualizando locação para terminada...");
  const { error: rentalError } = await supabase
    .from("rentals")
    .update({ status: "terminated", is_active: false })
    .eq("id", rental.id);

  if (rentalError) {
    console.error("❌ Erro ao atualizar locação:", rentalError);
  } else {
    console.log("✅ Locação atualizada para: terminated");
  }

  console.log("🎉 Finalização da rescisão processada com sucesso!");
}

export async function getPaymentsByRentalId(rentalId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq('rental_id', rentalId);
    
  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
}

export const getByRentalId = getPaymentsByRentalId;

export async function deletePaymentsByRentalId(rentalId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('rental_id', rentalId);

  if (error) throw error;
}

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
 * FIX: Valor correto (monthly_rent + garage_value)
 * FIX: Cria todas as parcelas até o fim do contrato
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

  console.log("\n📋 DADOS EXTRAÍDOS DO RENTAL:");
  console.log("  - ID:", rental.id);
  console.log("  - rental.value:", rental.value);
  console.log("  - rental.monthly_rent:", rental.monthly_rent);
  console.log("  - rental.garageValue:", rental.garageValue);
  console.log("  - rental.garage_value:", rental.garage_value);
  console.log("  - rental.hasGarage:", rental.hasGarage);

  const monthlyRent = rental.monthly_rent || rental.value || 0;
  const garageValue = rental.garageValue || rental.garage_value || 0;
  const monthlyValue = monthlyRent + (rental.hasGarage ? garageValue : 0);

  console.log("\n💰 VALORES CORRIGIDOS:");
  console.log("  - monthlyRent (CORRIGIDO):", monthlyRent);
  console.log("  - garageValue:", garageValue);
  console.log("  - monthlyValue (CALCULADO):", monthlyValue);

  console.log("\n📅 PERÍODO DO CONTRATO:");
  console.log("  - Início:", startDate.toISOString().split('T')[0]);
  console.log("  - Fim:", endDate.toISOString().split('T')[0]);
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const expectedMonths = Math.ceil(diffDays / 30);
  console.log("  - Dias totais:", diffDays);
  console.log("  - Meses esperados (aproximado):", expectedMonths);

  const payments = [];
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // ETAPA 1: Verificar se primeira parcela é proporcional
  const isFirstProportional = shouldUseProportionalRent(startDateStr, paymentDay);

  // Data de referência para começar a iterar
  let currentMonth = startDate.getMonth();
  let currentYear = startDate.getFullYear();

  console.log("📅 ESTADO INICIAL:", {
    currentMonth: currentMonth + 1,
    currentYear,
    isFirstProportional
  });

  // ETAPA 2: Primeira parcela (proporcional ou integral)
  if (isFirstProportional) {
    const firstPaymentDays = calculateDaysBetweenDates(startDateStr, paymentDay);
    const firstPaymentValue = calculateProportionalRent(monthlyValue, startDateStr, paymentDay);
    
    // Vencimento da primeira parcela proporcional
    let firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    
    console.log("🔄 Primeira parcela PROPORCIONAL:");
    console.log("   Data calculada inicialmente:", firstDueDate.toISOString().split('T')[0]);
    console.log("   startDate:", startDate.toISOString().split('T')[0]);
    
    // Se o dia de pagamento já passou no mês atual, vai para próximo mês
    if (firstDueDate <= startDate) {
      console.log("   ⚠️ Data de vencimento <= data início, avançando 1 mês");
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      firstDueDate = new Date(currentYear, currentMonth, paymentDay);
      console.log("   Nova data:", firstDueDate.toISOString().split('T')[0]);
    }
    
    // Ajuste para dias inexistentes
    if (firstDueDate.getMonth() !== currentMonth) {
      console.log("   ⚠️ Dia inexistente no mês, ajustando para último dia");
      firstDueDate = new Date(currentYear, currentMonth + 1, 0);
      console.log("   Data ajustada:", firstDueDate.toISOString().split('T')[0]);
    }

    payments.push({
      rental_id: rental.id,
      due_date: firstDueDate.toISOString().split('T')[0],
      expected_amount: firstPaymentValue,
      status: 'pending',
      reference_month: currentMonth + 1,
      reference_year: currentYear,
    });

    console.log(`✅ Parcela 1/${payments.length} criada: ${firstDueDate.toISOString().split('T')[0]} | Ref: ${currentMonth + 1}/${currentYear} | R$ ${firstPaymentValue.toFixed(2)}`);

    // Avançar para próximo mês
    console.log("📅 Avançando para próximo mês após primeira parcela proporcional");
    console.log("   ANTES: month =", currentMonth + 1, "year =", currentYear);
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    console.log("   DEPOIS: month =", currentMonth + 1, "year =", currentYear);
  } else {
    // Se não é proporcional, começar do mês da data de início
    const firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    
    console.log("✅ Primeira parcela INTEGRAL (não proporcional)");
    console.log("   Data calculada:", firstDueDate.toISOString().split('T')[0]);
    console.log("   startDate:", startDate.toISOString().split('T')[0]);
    
    // Se o vencimento for antes da data de início, vai para próximo mês
    if (firstDueDate < startDate) {
      console.log("   ⚠️ Data de vencimento < data início, avançando 1 mês");
      console.log("   ANTES: month =", currentMonth + 1, "year =", currentYear);
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      console.log("   DEPOIS: month =", currentMonth + 1, "year =", currentYear);
    }
  }

  // ETAPA 3: Parcelas mensais integrais
  console.log("\n🔄 INICIANDO LOOP DE PARCELAS MENSAIS:");
  console.log("  Estado inicial do loop: month =", currentMonth + 1, "year =", currentYear);
  
  let iterationCount = 0;
  const maxIterations = 100; // Segurança para evitar loop infinito
  
  // CORREÇÃO CRÍTICA: Iterar até endDate OU até atingir número esperado de meses
  while (iterationCount < expectedMonths + 1) { // +1 para garantir cobertura
    iterationCount++;
    
    if (iterationCount > maxIterations) {
      console.error("❌ ERRO: Loop excedeu limite de iterações!");
      break;
    }
    
    console.log(`\n--- Iteração ${iterationCount} ---`);
    console.log(`   Estado: month = ${currentMonth + 1}, year = ${currentYear}`);
    
    // Criar vencimento para o mês atual
    let dueDate = new Date(currentYear, currentMonth, paymentDay);
    
    console.log(`   Data criada: ${dueDate.toISOString().split('T')[0]} (${dueDate.getMonth() + 1}/${dueDate.getFullYear()})`);
    
    // Ajuste para dias inexistentes (ex: 31 de fev vira 28/29)
    if (dueDate.getMonth() !== currentMonth) {
      console.log(`   ⚠️ AJUSTE: Dia ${paymentDay} não existe no mês ${currentMonth + 1}`);
      console.log(`   Mês do objeto Date: ${dueDate.getMonth() + 1} (esperado: ${currentMonth + 1})`);
      dueDate = new Date(currentYear, currentMonth + 1, 0);
      console.log(`   Data ajustada para último dia do mês: ${dueDate.toISOString().split('T')[0]}`);
    }

    // PARAR se ultrapassar data final do contrato
    if (dueDate > endDate) {
      console.log(`   ⛔ PARANDO: ${dueDate.toISOString().split('T')[0]} > ${endDate.toISOString().split('T')[0]}`);
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

    console.log(`   ✅ Parcela ${payments.length} criada: ${dueDate.toISOString().split('T')[0]} | Ref: ${currentMonth + 1}/${currentYear} | R$ ${monthlyValue.toFixed(2)}`);

    // Avançar 1 mês
    console.log(`   📅 Avançando 1 mês...`);
    console.log(`   ANTES: month = ${currentMonth + 1}, year = ${currentYear}`);
    currentMonth++;
    if (currentMonth > 11) {
      console.log(`   ⚠️ Fim do ano! Voltando para Janeiro do próximo ano`);
      currentMonth = 0;
      currentYear++;
    }
    console.log(`   DEPOIS: month = ${currentMonth + 1}, year = ${currentYear}`);
  }

  console.log(`\n📊 RESUMO DA CRIAÇÃO:`);
  console.log(`   Total de parcelas criadas: ${payments.length}`);
  console.log(`   Total de iterações: ${iterationCount}`);
  console.log(`   Meses esperados: ${expectedMonths}`);

  if (payments.length < expectedMonths - 1) {
    console.warn(`   ⚠️ ATENÇÃO: Criadas menos parcelas que o esperado!`);
    console.warn(`   Diferença: ${expectedMonths - payments.length} meses`);
  }

  // Validação extra: verificar se há duplicatas de mês/ano
  const monthYearSet = new Set<string>();
  const duplicateMonths: string[] = [];
  
  payments.forEach((p, idx) => {
    const key = `${p.reference_year}-${String(p.reference_month).padStart(2, "0")}`;
    if (monthYearSet.has(key)) {
      duplicateMonths.push(`Parcela ${idx + 1}: ${key} (${p.due_date})`);
    }
    monthYearSet.add(key);
  });

  if (duplicateMonths.length > 0) {
    console.error("❌ ERRO: DUPLICATAS DETECTADAS!");
    console.error("Meses duplicados:", duplicateMonths);
    throw new Error(`Duplicatas detectadas na geração de parcelas: ${duplicateMonths.join(", ")}`);
  }

  console.log(`✅ Validação: Nenhuma duplicata detectada`);

  // Inserir todas as parcelas no banco
  const { data, error } = await supabase
    .from("payments")
    .insert(payments)
    .select();

  if (error) {
    console.error("❌ ERRO ao criar pagamentos:", error);
    throw error;
  }

  console.log(`✅ Sucesso! Criados ${data?.length || 0} pagamentos no banco`);
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
        const monthlyValue = rental.monthly_rent || rental.value || 0;

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

/**
 * Atualiza recebimentos pendentes quando locação é editada
 * Atualiza valores, datas, e sincroniza com mudanças no contrato
 * GERENCIA criação/deleção de recebimentos ao alterar período do contrato
 */
export async function updatePendingPaymentsOnRentalEdit(rentalData: {
  id: string;
  startDate: string;
  endDate: string | null;
  paymentDay: number;
  value: number;
}): Promise<void> {
  console.log("=== INICIO updatePendingPaymentsOnRentalEdit ===");
  console.log("Rental data:", rentalData);

  const startDate = new Date(rentalData.startDate);
  const endDate = rentalData.endDate 
    ? new Date(rentalData.endDate) 
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  
  const paymentDay = rentalData.paymentDay;
  const monthlyValue = rentalData.value;

  console.log("Período do contrato:", {
    inicio: startDate.toISOString().split('T')[0],
    fim: endDate.toISOString().split('T')[0]
  });

  // 1. Buscar TODOS recebimentos pendentes/atrasados/parciais (não apenas pending)
  const { data: existingPayments, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalData.id)
    .in("status", ["pending", "overdue", "partial"])
    .order("due_date", { ascending: true });

  if (fetchError) {
    console.error("Erro ao buscar recebimentos:", fetchError);
    throw fetchError;
  }

  console.log(`📋 Encontrados ${existingPayments?.length || 0} recebimentos não pagos`);

  // 2. Calcular recebimentos esperados baseado no novo período
  const expectedPayments = [];
  const startDateStr = startDate.toISOString().split('T')[0];
  const isFirstProportional = shouldUseProportionalRent(startDateStr, paymentDay);

  let currentMonth = startDate.getMonth();
  let currentYear = startDate.getFullYear();

  // Primeira parcela (proporcional ou integral)
  if (isFirstProportional) {
    const firstPaymentValue = calculateProportionalRent(monthlyValue, startDateStr, paymentDay);
    let firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    
    if (firstDueDate <= startDate) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    }
    
    if (firstDueDate.getMonth() !== currentMonth) {
      firstDueDate = new Date(currentYear, currentMonth + 1, 0);
    }

    expectedPayments.push({
      due_date: firstDueDate.toISOString().split('T')[0],
      expected_amount: firstPaymentValue,
      reference_month: currentMonth + 1,
      reference_year: currentYear,
    });

    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  } else {
    const firstDueDate = new Date(currentYear, currentMonth, paymentDay);
    if (firstDueDate < startDate) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  // Parcelas mensais integrais
  while (true) {
    let dueDate = new Date(currentYear, currentMonth, paymentDay);
    
    if (dueDate.getMonth() !== currentMonth) {
      dueDate = new Date(currentYear, currentMonth + 1, 0);
    }

    // PARAR se ultrapassar data final do contrato
    if (dueDate > endDate) {
      console.log(`⛔ Parando: ${dueDate.toISOString().split('T')[0]} > ${endDate.toISOString().split('T')[0]}`);
      break;
    }

    expectedPayments.push({
      due_date: dueDate.toISOString().split('T')[0],
      expected_amount: monthlyValue,
      reference_month: currentMonth + 1,
      reference_year: currentYear,
    });

    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  console.log(`📊 Recebimentos esperados: ${expectedPayments.length}`);

  // 3. ATUALIZAR recebimentos existentes que ainda estão dentro do período
  const paymentsToUpdate = Math.min(existingPayments?.length || 0, expectedPayments.length);
  
  for (let i = 0; i < paymentsToUpdate; i++) {
    const existing = existingPayments![i];
    const expected = expectedPayments[i];

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        due_date: expected.due_date,
        expected_amount: expected.expected_amount,
        reference_month: expected.reference_month,
        reference_year: expected.reference_year,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error(`Erro ao atualizar pagamento ${existing.id}:`, updateError);
      throw updateError;
    }

    console.log(`✅ Pagamento ${i + 1} atualizado: ${expected.due_date} - R$ ${expected.expected_amount.toFixed(2)}`);
  }

  // 4. CRIAR novos recebimentos se período AUMENTOU
  if (expectedPayments.length > (existingPayments?.length || 0)) {
    const newPayments = expectedPayments.slice(existingPayments?.length || 0).map(p => ({
      ...p,
      rental_id: rentalData.id,
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from("payments")
      .insert(newPayments);

    if (insertError) {
      console.error("Erro ao criar novos pagamentos:", insertError);
      throw insertError;
    }

    console.log(`✅ Criados ${newPayments.length} novos recebimentos (período aumentado)`);
  }

  // 5. DELETAR recebimentos pendentes que ficaram fora do novo período (se REDUZIU)
  if ((existingPayments?.length || 0) > expectedPayments.length) {
    const toDelete = existingPayments!.slice(expectedPayments.length);
    const idsToDelete = toDelete.map(p => p.id);

    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("Erro ao deletar recebimentos fora do período:", deleteError);
      throw deleteError;
    }

    console.log(`🗑️ Deletados ${toDelete.length} recebimentos (período reduzido)`);
    console.log("IDs deletados:", idsToDelete);
  }

  console.log("=== FIM updatePendingPaymentsOnRentalEdit ===");
}