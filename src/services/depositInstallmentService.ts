import { supabase } from "@/integrations/supabase/client";

export interface DepositInstallment {
  id: string;
  rental_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
  payment_date: string | null;
  paid_amount: number;
  status: "pending" | "paid" | "partial" | "overdue";
  payment_method: string | null;
  pix_key: string | null;
  notes: string | null;
  attachments: Array<{ url: string; name: string }>;
  created_at: string;
  updated_at: string;
}

/**
 * Criar parcelas de caução para uma locação
 */
export async function createDepositInstallments(
  rentalId: string,
  installments: Array<{
    installment_number: number;
    total_installments: number;
    amount: number;
    due_date: string;
  }>
): Promise<DepositInstallment[]> {
  try {
    const installmentsData = installments.map(inst => ({
      rental_id: rentalId,
      installment_number: inst.installment_number,
      installment_total: inst.total_installments,
      amount: inst.amount,
      due_date: inst.due_date,
      status: "pending",
      paid_amount: 0,
      pix_key: null,
      partner_commission: 0,
      internal_commission: 0,
    }));

    const { data, error } = await supabase
      .from("deposit_installments")
      .insert(installmentsData)
      .select();

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      rental_id: item.rental_id,
      installment_number: item.installment_number,
      total_installments: item.installment_total,
      amount: item.amount,
      due_date: item.due_date,
      payment_date: item.payment_date,
      paid_amount: item.paid_amount || 0,
      payment_method: item.payment_method,
      status: item.status,
      notes: item.notes,
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      pix_key: item.pix_key || null,
      partner_commission: item.partner_commission || 0,
      internal_commission: item.internal_commission || 0,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as DepositInstallment[];
  } catch (error) {
    console.error("Erro ao criar parcelas de caução:", error);
    throw error;
  }
}

/**
 * Buscar parcelas de caução de uma locação
 */
export async function getDepositInstallmentsByRental(
  rentalId: string
): Promise<DepositInstallment[]> {
  const { data, error } = await supabase
    .from("deposit_installments")
    .select("*")
    .eq("rental_id", rentalId)
    .order("installment_number", { ascending: true });

  if (error) {
    console.error("Erro ao buscar parcelas de caução:", error);
    throw error;
  }

  return data as DepositInstallment[];
}

/**
 * Buscar todas as parcelas de caução (com filtros opcionais)
 */
export async function getAllDepositInstallments(): Promise<DepositInstallment[]> {
  try {
    const { data, error } = await supabase
      .from("deposit_installments")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      rental_id: item.rental_id,
      installment_number: item.installment_number,
      total_installments: item.installment_total,
      amount: item.amount,
      due_date: item.due_date,
      payment_date: item.payment_date,
      paid_amount: item.paid_amount || 0,
      payment_method: item.payment_method,
      status: item.status,
      notes: item.notes,
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      pix_key: item.pix_key || null,
      partner_commission: item.partner_commission || 0,
      internal_commission: item.internal_commission || 0,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as DepositInstallment[];
  } catch (error) {
    console.error("Erro ao buscar parcelas de caução:", error);
    throw error;
  }
}

/**
 * Atualizar parcela de caução
 */
export async function updateDepositInstallment(
  id: string,
  updates: Partial<DepositInstallment>
): Promise<DepositInstallment> {
  try {
    // Convert DepositInstallment fields to database schema
    const dbUpdates: any = {};
    
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
    if (updates.payment_date !== undefined) dbUpdates.payment_date = updates.payment_date;
    if (updates.paid_amount !== undefined) dbUpdates.paid_amount = updates.paid_amount;
    if (updates.payment_method !== undefined) dbUpdates.payment_method = updates.payment_method;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.pix_key !== undefined) dbUpdates.pix_key = updates.pix_key;
    if (updates.partner_commission !== undefined) dbUpdates.partner_commission = updates.partner_commission;
    if (updates.internal_commission !== undefined) dbUpdates.internal_commission = updates.internal_commission;
    if (updates.attachments !== undefined) {
      dbUpdates.attachments = updates.attachments;
    }

    const { data, error } = await supabase
      .from("deposit_installments")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      rental_id: data.rental_id,
      installment_number: data.installment_number,
      total_installments: data.installment_total,
      amount: data.amount,
      due_date: data.due_date,
      payment_date: data.payment_date,
      paid_amount: data.paid_amount || 0,
      payment_method: data.payment_method,
      status: data.status,
      notes: data.notes,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      pix_key: data.pix_key || null,
      partner_commission: data.partner_commission || 0,
      internal_commission: data.internal_commission || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as DepositInstallment;
  } catch (error) {
    console.error("Erro ao atualizar parcela de caução:", error);
    throw error;
  }
}

/**
 * Registrar pagamento de parcela de caução
 */
export async function registerDepositInstallmentPayment(
  id: string,
  payment: {
    payment_date: string;
    paid_amount: number;
    payment_method?: string;
    pix_key?: string;
    notes?: string;
  }
): Promise<DepositInstallment> {
  // Buscar a parcela atual
  const { data: installment, error: fetchError } = await supabase
    .from("deposit_installments")
    .select("amount")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Erro ao buscar parcela:", fetchError);
    throw fetchError;
  }

  // Determinar status
  let status: "pending" | "paid" | "partial" = "pending";
  if (payment.paid_amount >= installment.amount) {
    status = "paid";
  } else if (payment.paid_amount > 0) {
    status = "partial";
  }

  const { data, error } = await supabase
    .from("deposit_installments")
    .update({
      payment_date: payment.payment_date,
      paid_amount: payment.paid_amount,
      payment_method: payment.payment_method,
      pix_key: payment.pix_key,
      notes: payment.notes,
      status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao registrar pagamento:", error);
    throw error;
  }

  return data as DepositInstallment;
}

/**
 * Atualizar status de parcelas vencidas
 */
export async function updateOverdueDepositInstallments(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("deposit_installments")
    .update({ status: "overdue" })
    .lt("due_date", today)
    .in("status", ["pending", "partial"]);

  if (error) {
    console.error("Erro ao atualizar parcelas vencidas:", error);
    throw error;
  }
}

/**
 * Deletar parcelas de caução de uma locação
 */
export async function deleteDepositInstallmentsByRental(
  rentalId: string
): Promise<void> {
  const { error } = await supabase
    .from("deposit_installments")
    .delete()
    .eq("rental_id", rentalId);

  if (error) {
    console.error("Erro ao deletar parcelas de caução:", error);
    throw error;
  }
}

export async function markDepositInstallmentAsPaid(
  id: string,
  paymentDate: string,
  paymentMethod: string,
  notes?: string,
  attachments?: Array<{ url: string; name: string }>
): Promise<DepositInstallment> {
  try {
    const updates: any = {
      status: "paid",
      payment_date: paymentDate,
      payment_method: paymentMethod,
    };

    if (notes) updates.notes = notes;
    if (attachments) updates.attachments = attachments;

    const { data, error } = await supabase
      .from("deposit_installments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      rental_id: data.rental_id,
      installment_number: data.installment_number,
      total_installments: data.installment_total,
      amount: data.amount,
      due_date: data.due_date,
      payment_date: data.payment_date,
      paid_amount: data.paid_amount || 0,
      payment_method: data.payment_method,
      status: data.status,
      notes: data.notes,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      pix_key: data.pix_key || null,
      partner_commission: data.partner_commission || 0,
      internal_commission: data.internal_commission || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as DepositInstallment;
  } catch (error) {
    console.error("Erro ao marcar parcela como paga:", error);
    throw error;
  }
}