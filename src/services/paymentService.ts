import { supabase } from "@/integrations/supabase/client";
import { Payment, PaymentInstallment, PaymentFilters, Rental } from "@/types";

const PAYMENTS_TABLE = "payments";
const DEPOSIT_INSTALLMENTS_TABLE = "deposit_installments";

// Função para calcular e validar o status correto do pagamento
const calculatePaymentStatus = (
  totalExpectedAmount: number,
  paidAmount: number | null | undefined,
  paymentDate: string | null | undefined
): "pending" | "paid" | "overdue" | "partial" => {
  const paid = paidAmount || 0;
  const expected = totalExpectedAmount || 0;
  
  // CORREÇÃO CRÍTICA: Tolerância para erro de ponto flutuante
  // Se a diferença for menor que 5 centavos, considera pago
  // Isso resolve o problema de status "parcial" com valor zerado
  if (Math.abs(expected - paid) <= 0.05) {
    return "paid";
  }
  
  // Se pagou mais que o esperado, está pago
  if (paid > expected) {
    return "paid";
  }

  // Se não foi pago nada (ou valor muito baixo)
  if (paid < 0.05) {
    if (!paymentDate) {
      // Se não tem data de pagamento, verificamos a data de vencimento (se disponível no contexto externo)
      // Aqui retornamos pending como padrão
      return "pending";
    }
    return "pending";
  }
  
  // Se chegou aqui, pagou algo mas não tudo, e a diferença é maior que 0.05
  return "partial";
};

const mapPaymentFromDb = (row: any): Payment => {
  const expectedAmount = Number(row.expected_amount || row.amount || 0);
  const paidAmount = Number(row.paid_amount || 0);
  
  const discount = Number(row.discount_amount || row.discount || 0);
  const lateFee = Number(row.late_fee || 0);
  const interest = Number(row.interest || 0);

  // CORREÇÃO DE LÓGICA: O status deve ser calculado sobre o TOTAL esperado (com taxas/descontos)
  const totalExpected = expectedAmount + lateFee + interest - discount;
  
  const dueDate = row.due_date;
  
  let correctStatus = calculatePaymentStatus(totalExpected, paidAmount, row.payment_date);
  
  // Verificação adicional de OVERDUE se estiver pendente e vencido
  if (correctStatus === "pending" && dueDate) {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const due = new Date(dueDate);
     due.setHours(0, 0, 0, 0);
     
     if (due < today) {
       correctStatus = "overdue";
     }
  }

  // Se o banco diz que está pago, confiamos (override manual ou perdão de dívida)
  if (row.status === 'paid') {
    correctStatus = 'paid';
  }
  
  // Força status pago se diferença for insignificante
  if (Math.abs(totalExpected - paidAmount) <= 0.05) {
    correctStatus = 'paid';
  }
  
  return {
    id: row.id,
    rentalId: row.rental_id,
    rental_id: row.rental_id,
    expectedAmount: expectedAmount,
    amount: expectedAmount,
    dueDate: row.due_date,
    due_date: row.due_date,
    status: correctStatus,
    paymentDate: row.payment_date || undefined,
    payment_date: row.payment_date || undefined,
    paymentTime: row.payment_time || undefined,
    discountAmount: discount,
    discount: discount,
    lateFee: lateFee,
    interest: interest,
    paidAmount: paidAmount || undefined,
    paid_amount: paidAmount || undefined,
    paymentMethod: row.payment_method || undefined,
    payment_method: row.payment_method || undefined,
    notes: row.notes || undefined,
    installmentNumber: row.installment || row.installment_number || undefined,
    installment_number: row.installment || row.installment_number || undefined,
    totalInstallments: row.total_installments,
    type: "monthly",
    property_address: row.rentals?.properties
      ? `${row.rentals.properties.address || ''}, ${row.rentals.properties.number || ''}`
      : undefined,
    tenant_name: row.rentals?.tenants?.name,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    referenceMonth: Number(row.reference_month),
    reference_month: Number(row.reference_month),
    referenceYear: Number(row.reference_year),
    reference_year: Number(row.reference_year),
    breakdown: row.breakdown,
    attachments: row.attachments
  };
};

// Esta função agora é usada apenas para CREATE, onde temos todos os dados
const mapPaymentToDb = (payment: Partial<Payment>) => {
  const expectedAmount = Number(payment.expectedAmount || payment.amount || 0);
  const paidAmount = Number(payment.paidAmount || payment.paid_amount || 0);
  const discount = Number(payment.discountAmount || payment.discount || 0);
  const lateFee = Number(payment.lateFee || 0); 
  const interest = Number(payment.interest || 0);
  
  const totalExpected = expectedAmount + lateFee + interest - discount;
  
  let correctStatus = calculatePaymentStatus(
    totalExpected,
    paidAmount,
    payment.paymentDate || payment.payment_date || null
  );
  
  if (payment.status === 'paid') {
    correctStatus = 'paid';
  }
  
  if (Math.abs(totalExpected - paidAmount) <= 0.05) {
    correctStatus = 'paid';
  }
  
  return {
    rental_id: payment.rentalId || payment.rental_id,
    expected_amount: expectedAmount,
    due_date: payment.dueDate || payment.due_date,
    status: correctStatus,
    payment_date: payment.paymentDate || payment.payment_date || null,
    payment_time: payment.paymentTime || null,
    discount_amount: discount,
    late_fee: lateFee,
    interest: interest,
    paid_amount: paidAmount || null,
    payment_method: payment.paymentMethod || payment.payment_method || null,
    notes: payment.notes || null,
    installment: payment.installmentNumber || payment.installment_number || null,
    reference_month: String(payment.referenceMonth || payment.reference_month || ''),
    reference_year: String(payment.referenceYear || payment.reference_year || ''),
    breakdown: payment.breakdown,
    attachments: payment.attachments
  };
};

export const getAll = async (filters?: PaymentFilters): Promise<Payment[]> => {
  try {
    // Cast supabase to any to prevent TS2589 deep type instantiation error
    let query = (supabase as any)
      .from(PAYMENTS_TABLE)
      .select(`
        *,
        rentals!payments_rental_id_fkey(
          properties!rentals_property_id_fkey(address, number),
          tenants!rentals_tenant_id_fkey(name)
        )
      `)
      .order("due_date", { ascending: false });

    if (filters) {
      const { status, location_id, month, year } = filters;

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (location_id) {
        const { data: rentals } = await (supabase as any)
          .from("rentals")
          .select("id")
          .eq("location_id", location_id);

        if (rentals && rentals.length > 0) {
          const rentalIds = rentals.map((r: any) => r.id);
          query = query.in("rental_id", rentalIds);
        } else {
          return [];
        }
      }

      if (month && year) {
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = `${year}-${month.padStart(2, "0")}-31`;
        query = query.gte("due_date", startDate).lte("due_date", endDate);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapPaymentFromDb);
  } catch (error) {
    throw error;
  }
};

export const getSingle = async (id: string): Promise<Payment | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .select(`
        *,
        rentals!payments_rental_id_fkey(
          properties!rentals_property_id_fkey(address, number),
          tenants!rentals_tenant_id_fkey(name)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapPaymentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const getById = getSingle;

export const create = async (payment: Omit<Payment, "id">): Promise<Payment> => {
  try {
    const paymentData = mapPaymentToDb(payment);

    const { data, error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .insert(paymentData)
      .select()
      .single();

    if (error) throw error;

    return mapPaymentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const update = async (id: string, payment: Partial<Payment>): Promise<Payment> => {
  try {
    // 1. Busca dados atuais para garantir cálculo correto do status
    const current = await getSingle(id);
    if (!current) throw new Error("Payment not found");

    // 2. Mescla dados para cálculo
    const merged = { ...current, ...payment };
    
    // 3. Recalcula status com dados completos
    const expectedAmount = merged.expectedAmount || merged.amount || 0;
    const paidAmount = merged.paidAmount || merged.paid_amount || 0;
    const discount = merged.discountAmount || merged.discount || 0;
    const lateFee = merged.lateFee || 0;
    const interest = merged.interest || 0;
    
    const totalExpected = expectedAmount + lateFee + interest - discount;
    
    let newStatus = calculatePaymentStatus(
      totalExpected, 
      paidAmount, 
      payment.paymentDate !== undefined ? payment.paymentDate : current.paymentDate
    );
    
    if (payment.status === 'paid') newStatus = 'paid';
    
    // 4. Prepara payload APENAS com campos enviados + status calculado
    // Não usamos mapPaymentToDb aqui para evitar sobrescrever com 0 campos não enviados
    const payload: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    if (payment.expectedAmount !== undefined) payload.expected_amount = payment.expectedAmount;
    if (payment.amount !== undefined) payload.expected_amount = payment.amount;
    if (payment.dueDate !== undefined) payload.due_date = payment.dueDate;
    if (payment.paymentDate !== undefined) payload.payment_date = payment.paymentDate;
    if (payment.paymentTime !== undefined) payload.payment_time = payment.paymentTime;
    if (payment.discountAmount !== undefined) payload.discount_amount = payment.discountAmount;
    if (payment.paidAmount !== undefined) payload.paid_amount = payment.paidAmount;
    if (payment.paymentMethod !== undefined) payload.payment_method = payment.paymentMethod;
    if (payment.notes !== undefined) payload.notes = payment.notes;
    if (payment.installmentNumber !== undefined) payload.installment = payment.installmentNumber;
    if (payment.lateFee !== undefined) payload.late_fee = payment.lateFee;
    if (payment.interest !== undefined) payload.interest = payment.interest;
    if (payment.referenceMonth !== undefined) payload.reference_month = String(payment.referenceMonth);
    if (payment.referenceYear !== undefined) payload.reference_year = String(payment.referenceYear);
    if (payment.breakdown !== undefined) payload.breakdown = payment.breakdown;
    if (payment.attachments !== undefined) payload.attachments = payment.attachments;

    const { data, error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return mapPaymentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const remove = async (id: string): Promise<void> => {
  try {
    const { error } = await (supabase as any).from(PAYMENTS_TABLE).delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const getByRental = async (rentalId: string): Promise<Payment[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .select("*")
      .eq("rental_id", rentalId)
      .order("due_date", { ascending: false });

    if (error) throw error;

    return (data || []).map(mapPaymentFromDb);
  } catch (error) {
    throw error;
  }
};

export const getByRentalId = getByRental;

export const deletePaymentsByRentalId = async (rentalId: string): Promise<void> => {
  try {
    const { error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .delete()
      .eq("rental_id", rentalId)
      .eq("status", "pending");

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const createPaymentsForRental = async (
  rental: Rental
): Promise<Payment[]> => {
  try {
    const payments: Omit<Payment, "id">[] = [];
    
    // Tratamento seguro para data de início
    const startDateStr = typeof rental.startDate === 'string' 
      ? rental.startDate 
      : (rental.startDate as any)?.toISOString?.()?.split('T')[0] || new Date().toISOString();
      
    const start = new Date(startDateStr);
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
    
    let end: Date;
    if (rental.endDate) {
      const endDateStr = typeof rental.endDate === 'string'
        ? rental.endDate
        : (rental.endDate as any)?.toISOString?.()?.split('T')[0];
        
      end = new Date(endDateStr);
      end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + 12);
    }

    const paymentDay = rental.paymentDay || 1;
    const currentDate = new Date(start);
    
    // Ajuste de data inicial
    if (currentDate.getDate() > paymentDay) {
       currentDate.setMonth(currentDate.getMonth() + 1);
    }
    currentDate.setDate(paymentDay);

    let installmentCount = 1;
    let safetyCounter = 0;
    
    while (currentDate <= end && safetyCounter < 60) {
      safetyCounter++;
      
      const referenceMonth = currentDate.getMonth() + 1;
      const referenceYear = currentDate.getFullYear();
      const dueDate = currentDate.toISOString().split('T')[0];
      
      payments.push({
        rentalId: rental.id,
        rental_id: rental.id,
        expectedAmount: rental.value,
        amount: rental.value,
        dueDate: dueDate,
        due_date: dueDate,
        status: "pending",
        referenceMonth,
        reference_month: referenceMonth,
        referenceYear,
        reference_year: referenceYear,
        installmentNumber: installmentCount,
        installment_number: installmentCount,
        type: "monthly",
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
      installmentCount++;
    }

    if (payments.length === 0) return [];

    const paymentsData = payments.map(mapPaymentToDb);

    const { data, error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .insert(paymentsData)
      .select();

    if (error) throw error;

    return (data || []).map(mapPaymentFromDb);
  } catch (error) {
    console.error("Erro ao gerar pagamentos:", error);
    throw error;
  }
};

export const updateFuturePayments = async (
  rentalId: string,
  newAmount: number
): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .update({ expected_amount: newAmount })
      .eq("rental_id", rentalId)
      .eq("status", "pending")
      .gte("due_date", today);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const updateFuturePaymentsOnPaymentDayChange = async (
  rentalId: string,
  newPaymentDay: number
): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: payments, error: fetchError } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .select("id, due_date, reference_month, reference_year")
      .eq("rental_id", rentalId)
      .eq("status", "pending")
      .gte("due_date", today);

    if (fetchError) throw fetchError;

    if (!payments || payments.length === 0) return;

    const updates = payments.map((payment: any) => {
      let newDateStr = payment.due_date;
      
      const refMonth = parseInt(payment.reference_month);
      const refYear = parseInt(payment.reference_year);
      
      if (!isNaN(refMonth) && !isNaN(refYear)) {
        const newDate = new Date(refYear, refMonth - 1, newPaymentDay);
        newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset());
        newDateStr = newDate.toISOString().split('T')[0];
      } else {
        const currentDate = new Date(payment.due_date);
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), newPaymentDay);
        newDateStr = newDate.toISOString().split('T')[0];
      }

      return {
        id: payment.id,
        due_date: newDateStr
      };
    });

    for (const update of updates) {
      await (supabase as any)
        .from(PAYMENTS_TABLE)
        .update({ due_date: update.due_date })
        .eq("id", update.id);
    }

  } catch (error) {
    throw error;
  }
};

export const updatePendingPaymentsOnRentalEdit = async (
  rentalId: string,
  updates: {
    amount?: number;
    paymentDay?: number;
  }
): Promise<void> => {
  try {
    if (updates.amount !== undefined) {
      await updateFuturePayments(rentalId, updates.amount);
    }
    
    if (updates.paymentDay !== undefined) {
      await updateFuturePaymentsOnPaymentDayChange(rentalId, updates.paymentDay);
    }
  } catch (error) {
    throw error;
  }
};

export const migrateProportionalFirstPayments = async (): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  errors: any[];
}> => {
  console.log("Migração não implementada no frontend");
  return {
    success: true,
    processed: 0,
    updated: 0,
    errors: []
  };
};

// --- Deposit Installments ---
const mapDepositInstallmentFromDb = (row: any): PaymentInstallment => {
  const amount = Number(row.amount || 0);
  const paidAmount = Number(row.paid_amount || 0);
  
  const discount = Number(row.discount_amount || row.discount || 0);
  const fine = Number(row.penalty_amount || row.fine || 0);
  const interest = Number(row.interest_amount || row.interest || 0);
  
  const totalExpected = amount + fine + interest - discount;
  
  let correctStatus = calculatePaymentStatus(totalExpected, paidAmount, null);
  
  if (row.status === 'paid') correctStatus = 'paid';
  
  if (Math.abs(totalExpected - paidAmount) <= 0.05) {
    correctStatus = 'paid';
  }
  
  return {
    id: row.id,
    rental_id: row.rental_id,
    rentalId: row.rental_id,
    installment_number: row.installment_number,
    installmentNumber: row.installment_number,
    amount: amount,
    due_date: row.due_date,
    dueDate: row.due_date,
    status: correctStatus,
    payment_date: row.payment_date || undefined,
    paymentDate: row.payment_date || undefined,
    payment_time: row.payment_time || undefined,
    paymentTime: row.payment_time || undefined,
    discount: discount,
    fine: fine,
    interest: interest,
    paid_amount: paidAmount || undefined,
    paidAmount: paidAmount || undefined,
    payment_method: row.payment_method || undefined,
    paymentMethod: row.payment_method || undefined,
    notes: row.notes || undefined,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
};

export const getDepositInstallmentsByRental = async (
  rentalId: string
): Promise<PaymentInstallment[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(DEPOSIT_INSTALLMENTS_TABLE)
      .select("*")
      .eq("rental_id", rentalId)
      .order("installment_number", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDepositInstallmentFromDb);
  } catch (error) {
    throw error;
  }
};

export const getDepositInstallment = async (
  id: string
): Promise<PaymentInstallment | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from(DEPOSIT_INSTALLMENTS_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapDepositInstallmentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const updateDepositInstallment = async (
  id: string,
  installment: Partial<PaymentInstallment>
): Promise<PaymentInstallment> => {
  try {
    // Para parcelas de caução, como é mais simples, mantemos a lógica,
    // mas adicionamos o cálculo correto
    const amount = Number(installment.amount || 0);
    const paidAmount = Number(installment.paidAmount || installment.paid_amount || 0);
    const discount = Number(installment.discount || 0);
    const fine = Number(installment.fine || 0);
    const interest = Number(installment.interest || 0);
    
    const totalExpected = amount + fine + interest - discount;
    
    let correctStatus = calculatePaymentStatus(
      totalExpected,
      paidAmount,
      installment.paymentDate || installment.payment_date || null
    );
    
    if (installment.status === 'paid') correctStatus = 'paid';
    if (Math.abs(totalExpected - paidAmount) <= 0.05) correctStatus = 'paid';
    
    const updateData = {
      status: correctStatus,
      payment_date: installment.paymentDate || installment.payment_date || null,
      payment_time: installment.paymentTime || installment.payment_time || null,
      discount_amount: discount,
      penalty_amount: fine,
      interest_amount: interest,
      paid_amount: paidAmount || null,
      payment_method: installment.paymentMethod || installment.payment_method || null,
      notes: installment.notes || null,
    };

    const { data, error } = await (supabase as any)
      .from(DEPOSIT_INSTALLMENTS_TABLE)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return mapDepositInstallmentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const getAllDepositInstallments = async (
  filters?: PaymentFilters
): Promise<PaymentInstallment[]> => {
  try {
    let query = (supabase as any)
      .from(DEPOSIT_INSTALLMENTS_TABLE)
      .select("*")
      .order("due_date", { ascending: false });

    if (filters) {
      const { status, location_id, month, year } = filters;

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (location_id) {
        const { data: rentals } = await (supabase as any)
          .from("rentals")
          .select("id")
          .eq("location_id", location_id);

        if (rentals && rentals.length > 0) {
          const rentalIds = rentals.map((r: any) => r.id);
          query = query.in("rental_id", rentalIds);
        } else {
          return [];
        }
      }

      if (month && year) {
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = `${year}-${month.padStart(2, "0")}-31`;
        query = query.gte("due_date", startDate).lte("due_date", endDate);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapDepositInstallmentFromDb);
  } catch (error) {
    throw error;
  }
};

export const createMany = async (payments: Omit<Payment, "id">[]): Promise<Payment[]> => {
  try {
    const paymentsData = payments.map(mapPaymentToDb);

    const { data, error } = await (supabase as any)
      .from(PAYMENTS_TABLE)
      .insert(paymentsData)
      .select();

    if (error) throw error;

    return (data || []).map(mapPaymentFromDb);
  } catch (error) {
    throw error;
  }
};

export const updateRentalPaymentStatus = async (
  rentalId: string,
  newStatus: string
): Promise<void> => {
  try {
    const { error } = await (supabase as any)
      .from("rentals")
      .update({ status: newStatus })
      .eq("id", rentalId);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const updateMany = async (
  updates: Array<{ id: string; data: Partial<Payment> }>
): Promise<void> => {
  try {
    const updatePromises = updates.map(({ id, data }) => update(id, data));
    await Promise.all(updatePromises);
  } catch (error) {
    throw error;
  }
};