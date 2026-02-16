import { supabase } from "@/integrations/supabase/client";
import { Payment, PaymentInstallment, PaymentFilters } from "@/types";

/**
 * CRITICAL: Função para calcular o status correto do pagamento
 * Esta função DEVE ser usada em TODAS as operações que envolvem status de pagamento
 * 
 * Regras:
 * 1. Se a diferença entre esperado e pago for <= 5 centavos -> PAGO
 * 2. Se há data de pagamento e valor pago > 0 -> PARCIAL
 * 3. Caso contrário -> PENDENTE
 * 
 * Esta lógica está DUPLICADA no banco de dados (trigger) para garantia máxima
 */
const calculatePaymentStatus = (
  expectedAmount: number,
  paidAmount: number,
  discount: number,
  lateFee: number,
  interest: number,
  paymentDate: string | null
): "paid" | "pending" | "overdue" | "partial" => {
  // Calcular o valor total esperado (com taxas e descontos)
  const totalExpected = expectedAmount + lateFee + interest - discount;
  const remaining = totalExpected - paidAmount;

  // CRÍTICO: Tolerância para erros de ponto flutuante (5 centavos)
  // Se a diferença for insignificante, considerar como PAGO
  if (Math.abs(remaining) <= 0.05) {
    return "paid";
  }

  // Se há pagamento parcial
  if (paymentDate && paidAmount > 0) {
    return "partial";
  }

  return "pending";
};

/**
 * CRITICAL: Mapear dados do banco para o formato da aplicação
 * SEMPRE recalcula o status para garantir consistência
 */
const mapPaymentFromDb = (data: any): Payment => {
  const expectedAmount = Number(data.expected_amount) || 0;
  const paidAmount = Number(data.paid_amount) || 0;
  const discount = Number(data.discount) || 0;
  const lateFee = Number(data.late_fee) || 0;
  const interest = Number(data.interest) || 0;

  // CRÍTICO: Sempre recalcular o status com base nos valores
  const correctStatus = calculatePaymentStatus(
    expectedAmount,
    paidAmount,
    discount,
    lateFee,
    interest,
    data.payment_date
  );

  return {
    id: data.id,
    rentalId: data.rental_id,
    rental_id: data.rental_id,
    propertyId: data.property_id,
    property_id: data.property_id,
    tenantId: data.tenant_id,
    tenant_id: data.tenant_id,
    expectedAmount,
    expected_amount: expectedAmount,
    paidAmount,
    paid_amount: paidAmount,
    paymentDate: data.payment_date,
    payment_date: data.payment_date,
    referenceMonth: data.reference_month ? parseInt(data.reference_month, 10) : new Date().getMonth() + 1,
    reference_month: data.reference_month,
    referenceYear: data.reference_year ? parseInt(data.reference_year, 10) : new Date().getFullYear(),
    reference_year: data.reference_year,
    status: correctStatus, // SEMPRE usar o status calculado, nunca o do banco
    discount,
    lateFee,
    late_fee: lateFee,
    interest,
    notes: data.notes || "",
    paymentMethod: data.payment_method || "",
    payment_method: data.payment_method || "",
    receiptUrl: data.receipt_url || "",
    receipt_url: data.receipt_url || "",
    createdAt: data.created_at,
    created_at: data.created_at,
    updatedAt: data.updated_at,
    updated_at: data.updated_at,
    locationId: data.location_id,
    location_id: data.location_id,
    paymentTime: data.payment_time || null,
    payment_time: data.payment_time || null,
    rental: data.rental || null,
    property: data.properties || null,
    tenant: data.tenants || null,
  };
};

/**
 * CRITICAL: Mapear dados da aplicação para o banco
 * SEMPRE recalcula o status antes de salvar
 */
const mapPaymentToDb = (payment: Partial<Payment>): any => {
  const expectedAmount = Number(payment.expectedAmount || 0);
  const paidAmount = Number(payment.paidAmount || 0);
  const discount = Number(payment.discount || 0);
  const lateFee = Number(payment.lateFee || 0);
  const interest = Number(payment.interest || 0);

  // CRÍTICO: Sempre recalcular o status com base nos valores
  const correctStatus = calculatePaymentStatus(
    expectedAmount,
    paidAmount,
    discount,
    lateFee,
    interest,
    payment.paymentDate || null
  );

  const dbData: any = {
    rental_id: payment.rentalId || payment.rental_id,
    property_id: payment.propertyId || payment.property_id,
    tenant_id: payment.tenantId || payment.tenant_id,
    expected_amount: expectedAmount,
    paid_amount: paidAmount,
    payment_date: payment.paymentDate || payment.payment_date || null,
    reference_month: String(payment.referenceMonth || payment.reference_month || new Date().getMonth() + 1),
    reference_year: String(payment.referenceYear || payment.reference_year || new Date().getFullYear()),
    status: correctStatus,
    discount,
    late_fee: lateFee,
    interest,
    notes: payment.notes || "",
    payment_method: payment.paymentMethod || payment.payment_method || "",
    receipt_url: payment.receiptUrl || payment.receipt_url || "",
    location_id: payment.locationId || payment.location_id,
    payment_time: payment.paymentTime || payment.payment_time || null,
  };

  // Remover campos undefined/null para evitar sobrescrever dados existentes
  Object.keys(dbData).forEach(key => {
    if (dbData[key] === undefined) {
      delete dbData[key];
    }
  });

  return dbData;
};

// Funções do serviço
export const getAll = async (filters?: PaymentFilters): Promise<Payment[]> => {
  try {
    let query = supabase
      .from("payments")
      .select(`
        *,
        rental:rentals(*),
        properties(*),
        tenants(*)
      `, { count: "exact" }) as any;

    if (filters) {
      const { status, location_id, month, year } = filters;

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (location_id) {
        query = query.eq("location_id", location_id);
      }

      if (month) {
        query = query.eq("reference_month", month);
      }

      if (year) {
        query = query.eq("reference_year", year);
      }
    }

    query = query.order("reference_year", { ascending: false })
                 .order("reference_month", { ascending: false });

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
      .from("payments")
      .select(`
        *,
        rental:rentals(*),
        properties(*),
        tenants(*)
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

/**
 * CRITICAL: Função de atualização reforçada
 * 
 * Processo:
 * 1. Busca dados atuais do banco
 * 2. Mescla com novos dados
 * 3. Calcula status correto com TODOS os valores
 * 4. Atualiza apenas campos enviados + status calculado
 */
export const update = async (id: string, payment: Partial<Payment>): Promise<Payment> => {
  try {
    // 1. Buscar dados atuais
    const current = await getSingle(id);
    if (!current) {
      throw new Error("Payment not found");
    }

    // 2. Mesclar dados atuais com novos dados
    const merged = { ...current, ...payment };

    // 3. Mapear para formato do banco (que já recalcula o status)
    const dbData = mapPaymentToDb(merged);

    // 4. Atualizar no banco
    const { data, error } = await supabase
      .from("payments")
      .update(dbData)
      .eq("id", id)
      .select(`
        *,
        rental:rentals(*),
        properties(*),
        tenants(*)
      `)
      .single();

    if (error) throw error;

    return mapPaymentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const create = async (payment: Omit<Payment, "id">): Promise<Payment> => {
  try {
    const dbData = mapPaymentToDb(payment);

    const { data, error } = await supabase
      .from("payments")
      .insert(dbData)
      .select(`
        *,
        rental:rentals(*),
        properties(*),
        tenants(*)
      `)
      .single();

    if (error) throw error;

    return mapPaymentFromDb(data);
  } catch (error) {
    throw error;
  }
};

export const remove = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

// Funções auxiliares mantidas
export const createPaymentsForRental = async (rental: {
  id: string;
  startDate: Date;
  endDate: Date | null;
  monthlyRent: number;
  paymentDay: number;
  propertyId: string;
  tenantId: string;
  locationId: string;
}): Promise<void> => {
  try {
    const payments: any[] = [];
    const start = new Date(rental.startDate);
    const end = rental.endDate ? new Date(rental.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

    let current = new Date(start);

    while (current <= end) {
      payments.push({
        rental_id: rental.id,
        property_id: rental.propertyId,
        tenant_id: rental.tenantId,
        expected_amount: rental.monthlyRent,
        paid_amount: 0,
        payment_date: null,
        reference_month: String(current.getMonth() + 1),
        reference_year: String(current.getFullYear()),
        status: "pending",
        discount: 0,
        late_fee: 0,
        interest: 0,
        notes: "",
        payment_method: "",
        receipt_url: "",
        location_id: rental.locationId,
        payment_time: null,
      });

      current = new Date(current.getFullYear(), current.getMonth() + 1, rental.paymentDay);
    }

    if (payments.length > 0) {
      const { error } = await supabase.from("payments").insert(payments);
      if (error) throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const updateFuturePayments = async (rentalId: string, newRent: number): Promise<void> => {
  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("status", "pending");

    if (error) throw error;

    if (payments && payments.length > 0) {
      const updatePromises = payments.map((payment) =>
        update(payment.id, { expectedAmount: newRent })
      );
      await Promise.all(updatePromises);
    }
  } catch (error) {
    throw error;
  }
};

export const updateFuturePaymentsOnPaymentDayChange = async (rentalId: string, newPaymentDay: number): Promise<void> => {
  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("status", "pending")
      .order("reference_year", { ascending: true })
      .order("reference_month", { ascending: true });

    if (error) throw error;

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        await update(payment.id, {});
      }
    }
  } catch (error) {
    throw error;
  }
};

export const updatePendingPaymentsOnRentalEdit = async (
  rentalId: string,
  updates: { expectedAmount?: number; paymentDay?: number }
): Promise<void> => {
  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("status", "pending");

    if (error) throw error;

    if (payments && payments.length > 0) {
      const updateData: Partial<Payment> = {};
      if (updates.expectedAmount !== undefined) {
        updateData.expectedAmount = updates.expectedAmount;
      }

      const updatePromises = payments.map((payment) =>
        update(payment.id, updateData)
      );
      await Promise.all(updatePromises);
    }
  } catch (error) {
    throw error;
  }
};

export const migrateProportionalFirstPayments = async (): Promise<{ success: boolean; count: number }> => {
  try {
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("id, start_date, payment_day, monthly_rent")
      .not("proportional_first_payment", "is", null);

    if (rentalsError) throw rentalsError;

    let count = 0;

    for (const rental of rentals || []) {
      const startDate = new Date(rental.start_date);
      const firstPaymentMonth = startDate.getMonth() + 1;
      const firstPaymentYear = startDate.getFullYear();

      const { data: firstPayment, error: paymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("rental_id", rental.id)
        .eq("reference_month", String(firstPaymentMonth))
        .eq("reference_year", String(firstPaymentYear))
        .single();

      if (paymentError || !firstPayment) continue;

      await update(firstPayment.id, {});
      count++;
    }

    return { success: true, count };
  } catch (error) {
    return { success: false, count: 0 };
  }
};

export const deletePaymentsByRentalId = async (rentalId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("rental_id", rentalId);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const getById = getSingle;

const paymentService = {
  getAll,
  getSingle,
  update,
  create,
  remove,
  createPaymentsForRental,
  updateFuturePayments,
  updateFuturePaymentsOnPaymentDayChange,
  updatePendingPaymentsOnRentalEdit,
  migrateProportionalFirstPayments,
  deletePaymentsByRentalId,
  getById,
};

export default paymentService;