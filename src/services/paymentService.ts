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

  async deletePendingByRentalId(rentalId: string): Promise<void> {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("rental_id", rentalId)
      .eq("status", "pending");
    
    if (error) throw error;
  },

  async deleteFutureByRentalId(rentalId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("rental_id", rentalId)
      .gt("due_date", today);
    
    if (error) throw error;
  },

  async updateOverdueStatus(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    
    const { error } = await supabase
      .from("payments")
      .update({ status: "overdue" })
      .lt("due_date", today)
      .in("status", ["pending", "partial"]);
    
    if (error) throw error;
  },

  async updateFuturePaymentsOnRentalValueChange(rentalId: string, newRentalValue: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    
    const { error } = await supabase
      .from("payments")
      .update({ expected_amount: newRentalValue })
      .gt("due_date", today)
      .eq("rental_id", rentalId);
    
    if (error) throw error;
  },

  async updateFuturePaymentsOnPaymentDayChange(rentalId: string, newPaymentDay: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all future payments for this rental
    const { data: futurePayments, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .gte("due_date", today.toISOString().split("T")[0])
      .order("due_date", { ascending: true });
    
    if (fetchError) throw fetchError;
    if (!futurePayments || futurePayments.length === 0) return;
    
    // Update each payment's due date
    for (const payment of futurePayments) {
      const [year, month] = payment.due_date.split("-").map(Number);
      
      // Calculate last day of the month
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      
      // Adjust payment day if it exceeds month days
      const validDay = Math.min(newPaymentDay, lastDayOfMonth);
      
      // Create new due date
      const newDueDate = `${year}-${String(month).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;
      
      // Update payment
      const { error: updateError } = await supabase
        .from("payments")
        .update({ due_date: newDueDate })
        .eq("id", payment.id);
      
      if (updateError) throw updateError;
    }
  },

  async regeneratePaymentsFromCurrentMonth(rentalId: string, rental: { value: number; paymentDay: number; endDate: string | null; }): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Delete unpaid future payments from current month onwards
    await this.deleteFuturePaymentsFromCurrentMonth(rentalId);
    
    const paymentDay = rental.paymentDay;
    const payments: Omit<Payment, "id" | "createdAt">[] = [];
    
    // Start from current month
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();
    
    // Parse end date if exists
    let endDate: Date | null = null;
    if (rental.endDate) {
      const [endYear, endMonth, endDay] = rental.endDate.split("-").map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
      endDate.setHours(0, 0, 0, 0);
    }
    
    // Define max date: end date or 12 months ahead
    const maxDate = endDate || new Date(currentYear + 1, currentMonth, paymentDay);
    
    // Generate monthly payments
    while (true) {
      // Calculate last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Adjust payment day if it exceeds month days
      const validDay = Math.min(paymentDay, lastDayOfMonth);
      
      // Create due date in local timezone
      const dueDate = new Date(currentYear, currentMonth, validDay);
      dueDate.setHours(0, 0, 0, 0);
      
      // Check if exceeded max date
      if (dueDate > maxDate) break;
      
      // Format date as YYYY-MM-DD maintaining local timezone (NO UTC!)
      const dueDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;
      
      // Create payment
      const payment: Omit<Payment, "id" | "createdAt"> = {
        rentalId: rentalId,
        referenceMonth: currentMonth + 1,
        referenceYear: currentYear,
        dueDate: dueDateString,
        expectedAmount: rental.value,
        paidAmount: 0,
        paymentDate: null,
        status: "pending",
        paymentMethod: null,
        lateFee: 0,
        interest: 0,
        notes: null,
        attachments: [],
        partialPayments: [],
      };
      
      payments.push(payment);
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    // Create all payments
    for (const payment of payments) {
      await this.create(payment);
    }
  },

  async deleteFuturePaymentsFromCurrentMonth(rentalId: string): Promise<void> {
  },

  mapFromDB(data: any): Payment {
    return {
      id: data.id,
      rentalId: data.rental_id,
      referenceMonth: parseInt(data.reference_month),
      referenceYear: parseInt(data.reference_year),
      expectedAmount: parseFloat(data.expected_amount) || 0,
      paidAmount: parseFloat(data.paid_amount || 0),
      dueDate: data.due_date,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      paymentLocation: data.payment_location,
      paymentCode: data.payment_code,
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
      payment_location: payment.paymentLocation,
      payment_code: payment.paymentCode,
      notes: payment.notes,
      late_fee: payment.lateFee || 0,
      interest: payment.interest || 0,
      attachments: payment.attachments || [],
      partial_payments: payment.partialPayments || []
    };
  }
};