import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Buscar todos os métodos de pagamento
 */
export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Erro ao buscar métodos de pagamento:", error);
    throw error;
  }

  return data || [];
}

/**
 * Buscar apenas métodos de pagamento ativos (para selects do sistema)
 */
export async function getActivePaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Erro ao buscar métodos de pagamento ativos:", error);
    throw error;
  }

  return data || [];
}

/**
 * Criar novo método de pagamento
 */
export async function createPaymentMethod(data: {
  code: string;
  name: string;
  active?: boolean;
  display_order?: number;
}): Promise<PaymentMethod> {
  const { data: result, error } = await supabase
    .from("payment_methods")
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar método de pagamento:", error);
    throw error;
  }

  return result;
}

/**
 * Atualizar método de pagamento
 */
export async function updatePaymentMethod(
  id: string,
  data: Partial<PaymentMethod>
): Promise<PaymentMethod> {
  const { data: result, error } = await supabase
    .from("payment_methods")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar método de pagamento:", error);
    throw error;
  }

  return result;
}

/**
 * Deletar método de pagamento
 */
export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar método de pagamento:", error);
    throw error;
  }
}