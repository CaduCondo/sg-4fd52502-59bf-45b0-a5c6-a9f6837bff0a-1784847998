import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("active", true)
    .order("display_order");

  if (error) {
    console.error("❌ Erro ao buscar formas de pagamento:", error);
    throw error;
  }

  return data || [];
}

export async function getAllPaymentMethodsAdmin(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("display_order");

  if (error) {
    console.error("❌ Erro ao buscar formas de pagamento (admin):", error);
    throw error;
  }

  return data || [];
}

export async function createPaymentMethod(paymentMethod: Omit<PaymentMethod, "id" | "created_at" | "updated_at">): Promise<PaymentMethod> {
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(paymentMethod)
    .select()
    .single();

  if (error) {
    console.error("❌ Erro ao criar forma de pagamento:", error);
    throw error;
  }

  return data;
}

export async function updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const { data, error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ Erro ao atualizar forma de pagamento:", error);
    throw error;
  }

  return data;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ Erro ao deletar forma de pagamento:", error);
    throw error;
  }
}