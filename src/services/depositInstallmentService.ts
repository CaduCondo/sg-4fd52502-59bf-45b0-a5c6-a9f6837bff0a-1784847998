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
  const { data, error } = await supabase
    .from("deposit_installments")
    .insert(
      installments.map((inst) => ({
        rental_id: rentalId,
        installment_number: inst.installment_number,
        total_installments: inst.total_installments,
        amount: inst.amount,
        due_date: inst.due_date,
        status: "pending",
      }))
    )
    .select();

  if (error) {
    console.error("Erro ao criar parcelas de caução:", error);
    throw error;
  }

  return data as DepositInstallment[];
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
export async function getAllDepositInstallments(filters?: {
  status?: string;
  locationIds?: string[];
}): Promise<DepositInstallment[]> {
  let query = supabase
    .from("deposit_installments")
    .select(`
      *,
      rental:rentals(
        id,
        property:properties(
          id,
          location_id,
          complement,
          location:locations(
            id,
            name
          )
        ),
        tenant:tenants(
          id,
          name
        )
      )
    `)
    .order("due_date", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.locationIds && filters.locationIds.length > 0) {
    query = query.in("rental.property.location_id", filters.locationIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar todas as parcelas de caução:", error);
    throw error;
  }

  return data as any;
}

/**
 * Atualizar parcela de caução
 */
export async function updateDepositInstallment(
  id: string,
  updates: Partial<DepositInstallment>
): Promise<DepositInstallment> {
  const { data, error } = await supabase
    .from("deposit_installments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar parcela de caução:", error);
    throw error;
  }

  return data as DepositInstallment;
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