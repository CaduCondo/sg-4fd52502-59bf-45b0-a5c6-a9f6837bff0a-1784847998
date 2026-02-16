import { supabase } from "@/integrations/supabase/client";
import { Payment, PaymentInstallment, PaymentFilters } from "@/types";

const PAYMENTS_TABLE = "payments";
const DEPOSIT_INSTALLMENTS_TABLE = "deposit_installments";

// Função para calcular e validar o status correto do pagamento
const calculatePaymentStatus = (
  expectedAmount: number,
  paidAmount: number | null | undefined,
  paymentDate: string | null | undefined
): "pending" | "paid" | "overdue" | "partial" => {
  const paid = paidAmount || 0;
  
  // Se não foi pago nada, verifica se está atrasado
  if (paid === 0) {
    if (!paymentDate) {
      const today = new Date();
      const dueDate = new Date(paymentDate || "");
      return dueDate < today ? "overdue" : "pending";
    }
    return "pending";
  }
  
  // Se pagou tudo, está pago
  if (paid >= expectedAmount) {
    return "paid";
  }
  
  // Se pagou algo mas não tudo, está parcial
  // IMPORTANTE: Nunca deve ficar "partial" se o valor restante é zero!
  const remaining = expectedAmount - paid;
  if (remaining <= 0.01) { // Tolerância para erros de arredondamento
    return "paid";
  }
  
  return "partial";
};

const mapPaymentFromDb = (row: any): Payment => {
  const expectedAmount = row.expected_amount || row.amount || 0;
  const paidAmount = row.paid_amount || 0;
  
  // Calcula o status correto baseado nos valores
  const correctStatus = calculatePaymentStatus(expectedAmount, paidAmount, row.due_date);
  
  return {
    id: row.id,
    rentalId: row.rental_id,
    rental_id: row.rental_id,
    expectedAmount: expectedAmount,
    amount: expectedAmount,
    dueDate: row.due_date,
    due_date: row.due_date,
    // Usa o status correto calculado, não o que vem do banco
    status: correctStatus,
    paymentDate: row.payment_date || undefined,
    payment_date: row.payment_date || undefined,
    paymentTime: row.payment_time || undefined,
    discountAmount: row.discount_amount || row.discount || 0,
    discount: row.discount_amount || row.discount || 0,
    lateFee: 0,
    interest: 0,
    paidAmount: paidAmount || undefined,
    paid_amount: paidAmount || undefined,
    paymentMethod: row.payment_method || undefined,
    payment_method: row.payment_method || undefined,
    notes: row.notes || undefined,
    installmentNumber: row.installment || row.installment_number || undefined,
    installment_number: row.installment || row.installment_number || undefined,
    totalInstallments: undefined,
    type: "monthly",
    property_address: row.rentals?.properties
      ? `${row.rentals.properties.address}, ${row.rentals.properties.number}`
      : undefined,
    tenant_name: row.rentals?.tenants?.name,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    referenceMonth: row.reference_month,
    reference_month: row.reference_month,
    referenceYear: row.reference_year,
    reference_year: row.reference_year,
    breakdown: row.breakdown,
    attachments: row.attachments
  };
};

const mapPaymentToDb = (payment: Partial<Payment>) => {
  const expectedAmount = payment.expectedAmount || payment.amount || 0;
  const paidAmount = payment.paidAmount || payment.paid_amount || 0;
  
  // Calcula o status correto antes de salvar
  const correctStatus = calculatePaymentStatus(
    expectedAmount,
    paidAmount,
    payment.paymentDate || payment.payment_date || null
  );
  
  return {
    rental_id: payment.rentalId || payment.rental_id,
    expected_amount: expectedAmount,
    due_date: payment.dueDate || payment.due_date,
    // Força o status correto
    status: correctStatus,
    payment_date: payment.paymentDate || payment.payment_date || null,
    payment_time: payment.paymentTime || null,
    discount_amount: payment.discountAmount || payment.discount || 0,
    paid_amount: paidAmount || null,
    payment_method: payment.paymentMethod || payment.payment_method || null,
    notes: payment.notes || null,
    installment: payment.installmentNumber || payment.installment_number || null,
    reference_month: payment.referenceMonth || payment.reference_month,
    reference_year: payment.referenceYear || payment.reference_year,
    breakdown: payment.breakdown,
    attachments: payment.attachments
  };
};

export const getAll = async (filters?: PaymentFilters): Promise<Payment[]> => {
  try {
    let query = supabase
      .from(PAYMENTS_TABLE)
      .select(
        `
        *,
        rentals!payments_rental_id_fkey(
          properties!rentals_property_id_fkey(address, number),
          tenants!rentals_tenant_id_fkey(name)
        )
      `
      )
      .order("due_date", { ascending: false });

    if (filters) {
      const { status, location_id, month, year } = filters;

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (location_id) {
        const { data: rentals } = await supabase
          .from("rentals")
          .select("id")
          .eq("location_id", location_id);

        if (rentals && rentals.length > 0) {
          const rentalIds = rentals.map((r) => r.id);
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
    const { data, error } = await supabase
      .from(PAYMENTS_TABLE)
      .select(
        `
        *,
        rentals!payments_rental_id_fkey(
          properties!rentals_property_id_fkey(address, number),
          tenants!rentals_tenant_id_fkey(name)
        )
      `
      )
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

    const { data, error } = await supabase
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
    const paymentData = mapPaymentToDb(payment);

    const { data, error } = await supabase
      .from(PAYMENTS_TABLE)
      .update(paymentData)
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
    const { error } = await supabase.from(PAYMENTS_TABLE).delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const getByRental = async (rentalId: string): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
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
    const { error } = await supabase
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
  rentalId: string,
  payments: Omit<Payment, "id" | "rental_id" | "rentalId">[]
): Promise<Payment[]> => {
  try {
    const paymentsData = payments.map(p => {
      const mapped = mapPaymentToDb(p);
      return {
        ...mapped,
        rental_id: rentalId
      };
    });

    const { data, error } = await supabase
      .from(PAYMENTS_TABLE)
      .insert(paymentsData)
      .select();

    if (error) throw error;

    return (data || []).map(mapPaymentFromDb);
  } catch (error) {
    throw error;
  }
};

export const updateFuturePayments = async (
  rentalId: string,
  newAmount: number
): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
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
    
    const { data: payments, error: fetchError } = await supabase
      .from(PAYMENTS_TABLE)
      .select("id, due_date, reference_month, reference_year")
      .eq("rental_id", rentalId)
      .eq("status", "pending")
      .gte("due_date", today);

    if (fetchError) throw fetchError;

    if (!payments || payments.length === 0) return;

    const updates = payments.map(payment => {
      let newDateStr = payment.due_date;
      
      if (payment.reference_month && payment.reference_year) {
        const newDate = new Date(payment.reference_year, payment.reference_month - 1, newPaymentDay);
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
      await supabase
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

export const migrateProportionalFirstPayments = async (): Promise<void> => {
  console.log("Migração de pagamentos proporcionais não implementada no frontend");
};

// --- Deposit Installments ---

const mapDepositInstallmentFromDb = (row: any): PaymentInstallment => {
  const amount = row.amount || 0;
  const paidAmount = row.paid_amount || 0;
  
  // Calcula o status correto
  const correctStatus = calculatePaymentStatus(amount, paidAmount, row.due_date);
  
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
    discount: row.discount || 0,
    fine: row.fine || 0,
    interest: row.interest || 0,
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const amount = installment.amount || 0;
    const paidAmount = installment.paidAmount || installment.paid_amount || 0;
    
    // Calcula o status correto
    const correctStatus = calculatePaymentStatus(
      amount,
      paidAmount,
      installment.paymentDate || installment.payment_date || null
    );
    
    const updateData = {
      status: correctStatus,
      payment_date: installment.paymentDate || installment.payment_date || null,
      payment_time: installment.paymentTime || installment.payment_time || null,
      discount: installment.discount || 0,
      fine: installment.fine || 0,
      interest: installment.interest || 0,
      paid_amount: paidAmount || null,
      payment_method: installment.paymentMethod || installment.payment_method || null,
      notes: installment.notes || null,
    };

    const { data, error } = await supabase
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
    let query = supabase
      .from(DEPOSIT_INSTALLMENTS_TABLE)
      .select("*")
      .order("due_date", { ascending: false });

    if (filters) {
      const { status, location_id, month, year } = filters;

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (location_id) {
        const { data: rentals } = await supabase
          .from("rentals")
          .select("id")
          .eq("location_id", location_id);

        if (rentals && rentals.length > 0) {
          const rentalIds = rentals.map((r) => r.id);
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

    const { data, error } = await supabase
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
    const { error } = await supabase
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