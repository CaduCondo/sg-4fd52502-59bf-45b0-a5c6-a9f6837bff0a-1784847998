import { supabase } from "@/integrations/supabase/client";
import type { Payment } from "@/types";

export const paymentService = {
  async getAll(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("due_date", { ascending: false });
    
    if (error) throw error;
    return data.map(this.mapFromDB);
  },

  async getById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data ? this.mapFromDB(data) : null;
  },

  async getByRentalId(rentalId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .order("due_date", { ascending: true });
    
    if (error) throw error;
    return data.map(this.mapFromDB);
  },

  async create(payment: Omit<Payment, "id" | "createdAt">): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .insert([this.mapToDB(payment)])
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async update(payment: Payment): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .update({
        ...this.mapToDB(payment),
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  mapFromDB(data: any): Payment {
    return {
      id: data.id,
      rentalId: data.rental_id,
      referenceMonth: data.reference_month,
      referenceYear: data.reference_year,
      expectedAmount: parseFloat(data.expected_amount) || 0,
      paidAmount: parseFloat(data.paid_amount || 0),
      dueDate: data.due_date,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      status: data.status,
      lateFee: parseFloat(data.late_fee || 0),
      interest: parseFloat(data.interest || 0),
      notes: data.notes,
      attachments: data.attachments || [],
      partialPayments: data.partial_payments || [],
      createdAt: data.created_at
    };
  },

  mapToDB(payment: any): any {
    return {
      rental_id: payment.rentalId,
      reference_month: payment.referenceMonth,
      reference_year: payment.referenceYear,
      due_date: payment.dueDate,
      expected_amount: payment.expectedAmount,
      paid_amount: payment.paidAmount,
      payment_date: payment.paymentDate,
      status: payment.status,
      payment_method: payment.paymentMethod,
      notes: payment.notes,
      late_fee: payment.lateFee || 0,
      interest: payment.interest || 0,
      attachments: payment.attachments || [],
      partial_payments: []
    };
  }
};