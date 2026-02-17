import { supabase } from "@/integrations/supabase/client";
import { addMonths, format, setDate, parseISO, isAfter, startOfDay } from "date-fns";
import type { Payment, Rental } from "@/types";

/**
 * Mapeia os dados do banco para a interface Payment
 */
const mapPaymentFromDB = (data: any): Payment => ({
  id: data.id,
  rentalId: data.rental_id,
  rental_id: data.rental_id,
  propertyId: data.rental?.property_id || "",
  property_id: data.rental?.property_id || "",
  tenantId: data.rental?.tenant_id || "",
  tenant_id: data.rental?.tenant_id || "",
  dueDate: data.due_date,
  expectedAmount: Number(data.expected_amount || 0),
  paidAmount: Number(data.paid_amount || 0),
  paymentDate: data.payment_date,
  status: data.status,
  referenceMonth: parseInt(data.reference_month || "0"),
  referenceYear: parseInt(data.reference_year || "0"),
  discount: Number(data.discount_amount || 0), // Corrigido: discount_amount no banco -> discount na interface
  lateFee: Number(data.late_fee || 0),
  interest: Number(data.interest || 0),
  notes: data.notes || "",
  paymentMethod: data.payment_method || "",
  receiptUrl: data.receipt_url || "",
  createdAt: data.created_at,
  updatedAt: data.updated_at || data.created_at,
  type: "rent",
  rental: data.rental,
  property: data.rental?.properties,
  tenant: data.rental?.tenants,
  breakdown: data.breakdown || [],
  installment: data.installment,
  totalInstallments: data.total_installments,
});

/**
 * Busca todos os pagamentos
 */
export const getAll = async (): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      rental:rentals(
        *,
        properties(*),
        tenants(*)
      )
    `)
    .order("reference_year", { ascending: false })
    .order("reference_month", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
};

/**
 * Busca pagamento por ID
 */
export const getById = async (id: string): Promise<Payment | null> => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      rental:rentals(
        *,
        properties(*),
        tenants(*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching payment:", error);
    return null;
  }
  if (!data) return null;
  return mapPaymentFromDB(data);
};

/**
 * Busca pagamentos por ID da locação
 */
export const getByRentalId = async (rentalId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      rental:rentals(
        *,
        properties(*),
        tenants(*)
      )
    `)
    .eq("rental_id", rentalId)
    .order("reference_year", { ascending: false })
    .order("reference_month", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
};

/**
 * Busca pagamentos por período (mês/ano)
 */
export const getByPeriod = async (month: string, year: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      rental:rentals(
        *,
        properties(*),
        tenants(*)
      )
    `)
    .eq("reference_month", month)
    .eq("reference_year", year)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
};

/**
 * Atualiza um pagamento
 */
export const update = async (id: string, payment: Partial<Payment>): Promise<Payment> => {
  const updateData: any = {};

  if (payment.paidAmount !== undefined) updateData.paid_amount = payment.paidAmount;
  if (payment.paymentDate !== undefined) updateData.payment_date = payment.paymentDate;
  if (payment.status !== undefined) updateData.status = payment.status;
  if (payment.discount !== undefined) updateData.discount_amount = payment.discount; // Corrigido
  if (payment.lateFee !== undefined) updateData.late_fee = payment.lateFee;
  if (payment.interest !== undefined) updateData.interest = payment.interest;
  if (payment.notes !== undefined) updateData.notes = payment.notes;
  if (payment.paymentMethod !== undefined) updateData.payment_method = payment.paymentMethod;
  if (payment.receiptUrl !== undefined) updateData.receipt_url = payment.receiptUrl;
  if (payment.breakdown !== undefined) updateData.breakdown = payment.breakdown;

  const { data, error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      rental:rentals(
        *,
        properties(*),
        tenants(*)
      )
    `)
    .single();

  if (error) throw error;
  return mapPaymentFromDB(data);
};

/**
 * Cancela um pagamento (retorna para pendente)
 */
export const cancel = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("payments")
    .update({
      status: "pending",
      paid_amount: 0,
      payment_date: null,
      payment_method: null,
      receipt_url: null,
      notes: null,
      payment_time: null,
      discount_amount: 0,
      late_fee: 0,
      interest: 0
    })
    .eq("id", id);

  if (error) throw error;
};

/**
 * Remove um pagamento
 */
export const remove = async (id: string): Promise<void> => {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
};

/**
 * Cria pagamentos para uma nova locação
 */
export const createPaymentsForRental = async (
  rentalId: string,
  startDate: string,
  endDate: string,
  paymentDay: number,
  monthlyRent: number,
  rental: Rental
): Promise<void> => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  let currentDate = start;

  // Ajustar para o primeiro dia de pagamento
  // Se a data de início for depois do dia de pagamento, o primeiro pagamento é no próximo mês
  if (currentDate.getDate() > paymentDay) {
    currentDate = addMonths(currentDate, 1);
  }
  currentDate = setDate(currentDate, paymentDay);

  const payments = [];

  while (currentDate <= end) {
    // Breakdown padrão para novos pagamentos
    const breakdown = [
      { description: "Aluguel", value: rental.monthlyRent || monthlyRent, type: "rent" }
    ];

    if (rental.hasGarage && rental.garageValue && rental.garageValue > 0) {
      // Ajusta o valor do aluguel subtraindo a garagem
      breakdown[0].value = (rental.monthlyRent || monthlyRent) - rental.garageValue;
      breakdown.push({ description: "Garagem", value: rental.garageValue, type: "garage" });
    }

    payments.push({
      rental_id: rentalId,
      due_date: format(currentDate, "yyyy-MM-dd"),
      reference_month: format(currentDate, "M"),
      reference_year: format(currentDate, "yyyy"),
      expected_amount: monthlyRent,
      status: "pending",
      breakdown: breakdown
    });

    currentDate = addMonths(currentDate, 1);
  }

  if (payments.length > 0) {
    const { error } = await supabase.from("payments").insert(payments);
    if (error) throw error;
  }
};

/**
 * Atualiza pagamentos futuros quando o valor do aluguel muda
 */
export const updateFuturePayments = async (
  rentalId: string,
  newAmount: number,
  rental: Rental
): Promise<void> => {
  const today = new Date();
  
  // Buscar pagamentos futuros pendentes
  const { data: futurePayments, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .gte("due_date", format(today, "yyyy-MM-dd"));

  if (fetchError) throw fetchError;

  if (!futurePayments || futurePayments.length === 0) return;

  // Atualizar cada pagamento
  for (const payment of futurePayments) {
    const breakdown = [
      { description: "Aluguel", value: newAmount, type: "rent" }
    ];

    if (rental.hasGarage && rental.garageValue && rental.garageValue > 0) {
      breakdown[0].value = newAmount - rental.garageValue;
      breakdown.push({ description: "Garagem", value: rental.garageValue, type: "garage" });
    }

    await supabase
      .from("payments")
      .update({
        expected_amount: newAmount,
        breakdown: breakdown
      })
      .eq("id", payment.id);
  }
};

/**
 * Atualiza datas de vencimento de pagamentos futuros
 */
export const updateFuturePaymentsOnPaymentDayChange = async (
  rentalId: string,
  newPaymentDay: number
): Promise<void> => {
  const today = new Date();
  
  const { data: futurePayments, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .gte("due_date", format(today, "yyyy-MM-dd"));

  if (fetchError) throw fetchError;

  if (!futurePayments || futurePayments.length === 0) return;

  for (const payment of futurePayments) {
    const currentDueDate = parseISO(payment.due_date);
    
    // Manter mês e ano, apenas mudar o dia
    let newDate = setDate(currentDueDate, newPaymentDay);
    
    // Se o dia não existe no mês (ex: 31 em fevereiro), setDate ajusta para o próximo mês
    // Mas queremos manter no mesmo mês, então pegamos o último dia do mês
    if (newDate.getMonth() !== currentDueDate.getMonth()) {
      newDate = new Date(currentDueDate.getFullYear(), currentDueDate.getMonth() + 1, 0);
    }

    await supabase
      .from("payments")
      .update({
        due_date: format(newDate, "yyyy-MM-dd")
      })
      .eq("id", payment.id);
  }
};

/**
 * Remove pagamentos futuros (usado ao encurtar contrato)
 */
export const deletePaymentsByRentalId = async (rentalId: string): Promise<void> => {
  // Apenas deleta pagamentos pendentes
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("rental_id", rentalId)
    .eq("status", "pending");

  if (error) throw error;
};

export const updatePendingPaymentsOnRentalEdit = async (
  rentalId: string,
  newAmount: number,
  rental: Rental
): Promise<void> => {
  return updateFuturePayments(rentalId, newAmount, rental);
};