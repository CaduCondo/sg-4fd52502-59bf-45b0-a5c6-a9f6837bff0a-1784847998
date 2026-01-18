import { supabase } from "@/integrations/supabase/client";
import type { Payment } from "@/types";

export const paymentService = {
  async getAll(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        rental:rentals!payments_rental_id_fkey (
          *,
          property:properties!rentals_property_id_fkey (
            *,
            locationData:locations!properties_location_id_fkey (*)
          ),
          tenant:tenants (*)
        )
      `)
      .order("due_date", { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      rentalId: item.rental_id,
      dueDate: item.due_date,
      expectedAmount: item.expected_amount,
      paidAmount: item.paid_amount,
      paymentDate: item.payment_date,
      status: item.status,
      paymentMethod: item.payment_method,
      notes: item.notes,
      referenceMonth: item.reference_month,
      referenceYear: item.reference_year,
      receiptUrl: item.receipt_url,
      penaltyAmount: item.penalty_amount,
      interestAmount: item.interest_amount,
      discountAmount: item.discount_amount,
      paymentCode: item.payment_code,
      lateFee: item.late_fee ? Number(item.late_fee) : undefined,
      interest: item.interest ? Number(item.interest) : undefined,
      paymentLocation: item.payment_location,
      attachments: item.attachments,
      partialPayments: item.partial_payments,
      createdAt: item.created_at,
      
      rental: item.rental ? {
        ...item.rental,
        propertyId: item.rental.property_id,
        tenantId: item.rental.tenant_id,
        startDate: item.rental.start_date,
        endDate: item.rental.end_date,
        rentAmount: item.rental.rent_amount,
        monthlyRent: item.rental.rent_amount,
        paymentDay: item.rental.payment_day,
        status: item.rental.status,
        pixCode: item.rental.pix_code,
        property: item.rental.property ? {
          ...item.rental.property,
          location_id: item.rental.property.location_id,
          property_identifier: item.rental.property.property_identifier,
          monthly_rent: item.rental.property.monthly_rent,
          locationData: item.rental.property.locationData
        } : undefined,
        tenant: item.rental.tenant ? {
          ...item.rental.tenant,
          birthDate: item.rental.tenant.birth_date,
          zipCode: item.rental.tenant.zip_code
        } : undefined
      } : undefined
    })) as Payment[];
  },

  async getById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        rental:rentals!payments_rental_id_fkey (
          *,
          property:properties!rentals_property_id_fkey (
            *,
            locationData:locations!properties_location_id_fkey (*)
          ),
          tenant:tenants (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const item: any = data;

    return {
      id: item.id,
      rentalId: item.rental_id,
      dueDate: item.due_date,
      expectedAmount: item.expected_amount,
      paidAmount: item.paid_amount,
      paymentDate: item.payment_date,
      status: item.status,
      paymentMethod: item.payment_method,
      notes: item.notes,
      referenceMonth: item.reference_month,
      referenceYear: item.reference_year,
      receiptUrl: item.receipt_url,
      penaltyAmount: item.penalty_amount,
      interestAmount: item.interest_amount,
      discountAmount: item.discount_amount,
      paymentCode: item.payment_code,
      lateFee: item.late_fee ? Number(item.late_fee) : undefined,
      interest: item.interest ? Number(item.interest) : undefined,
      paymentLocation: item.payment_location,
      attachments: item.attachments,
      partialPayments: item.partial_payments,
      createdAt: item.created_at,
      
      rental: item.rental ? {
        ...item.rental,
        propertyId: item.rental.property_id,
        tenantId: item.rental.tenant_id,
        startDate: item.rental.start_date,
        endDate: item.rental.end_date,
        rentAmount: item.rental.rent_amount,
        monthlyRent: item.rental.rent_amount,
        paymentDay: item.rental.payment_day,
        status: item.rental.status,
        pixCode: item.rental.pix_code,
        property: item.rental.property ? {
          ...item.rental.property,
          location_id: item.rental.property.location_id,
          property_identifier: item.rental.property.property_identifier,
          monthly_rent: item.rental.property.monthly_rent,
          locationData: item.rental.property.locationData
        } : undefined,
        tenant: item.rental.tenant ? {
          ...item.rental.tenant,
          birthDate: item.rental.tenant.birth_date,
          zipCode: item.rental.tenant.zip_code
        } : undefined
      } : undefined
    } as Payment;
  },

  async getByRentalId(rentalId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .order("due_date", { ascending: true });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      rentalId: item.rental_id,
      dueDate: item.due_date,
      expectedAmount: item.expected_amount,
      paidAmount: item.paid_amount,
      paymentDate: item.payment_date,
      status: item.status,
      paymentMethod: item.payment_method,
      notes: item.notes,
      referenceMonth: item.reference_month,
      referenceYear: item.reference_year,
      receiptUrl: item.receipt_url,
      penaltyAmount: item.penalty_amount,
      interestAmount: item.interest_amount,
      discountAmount: item.discount_amount,
      paymentCode: item.payment_code,
      lateFee: item.late_fee ? Number(item.late_fee) : undefined,
      interest: item.interest ? Number(item.interest) : undefined,
      paymentLocation: item.payment_location,
      attachments: item.attachments,
      partialPayments: item.partial_payments,
      createdAt: item.created_at
    })) as Payment[];
  },

  async create(payment: Omit<Payment, "id" | "createdAt">): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .insert([{
        rental_id: payment.rentalId,
        due_date: payment.dueDate,
        expected_amount: payment.expectedAmount,
        paid_amount: payment.paidAmount,
        payment_date: payment.paymentDate,
        status: payment.status,
        payment_method: payment.paymentMethod,
        notes: payment.notes,
        reference_month: payment.referenceMonth?.toString(),
        reference_year: payment.referenceYear?.toString(),
        receipt_url: payment.receiptUrl,
        penalty_amount: payment.penaltyAmount,
        interest_amount: payment.interestAmount,
        discount_amount: payment.discountAmount,
        payment_code: payment.paymentCode,
        late_fee: payment.lateFee,
        interest: payment.interest,
        payment_location: payment.paymentLocation,
        attachments: payment.attachments || [],
        partial_payments: payment.partialPayments || []
      } as any])
      .select()
      .single();

    if (error) throw error;

    const item: any = data;
    return {
      id: item.id,
      rentalId: item.rental_id,
      dueDate: item.due_date,
      expectedAmount: item.expected_amount,
      paidAmount: item.paid_amount,
      paymentDate: item.payment_date,
      status: item.status,
      paymentMethod: item.payment_method,
      notes: item.notes,
      referenceMonth: Number(item.reference_month),
      referenceYear: Number(item.reference_year),
      receiptUrl: item.receipt_url,
      penaltyAmount: item.penalty_amount,
      interestAmount: item.interest_amount,
      discountAmount: item.discount_amount,
      paymentCode: item.payment_code,
      lateFee: item.late_fee ? Number(item.late_fee) : undefined,
      interest: item.interest ? Number(item.interest) : undefined,
      paymentLocation: item.payment_location,
      attachments: item.attachments,
      partialPayments: item.partial_payments,
      createdAt: item.created_at
    } as Payment;
  },

  async update(payment: Payment): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .update({
        rental_id: payment.rentalId,
        due_date: payment.dueDate,
        expected_amount: payment.expectedAmount,
        paid_amount: payment.paidAmount,
        payment_date: payment.paymentDate,
        status: payment.status,
        payment_method: payment.paymentMethod,
        notes: payment.notes,
        reference_month: payment.referenceMonth?.toString(),
        reference_year: payment.referenceYear?.toString(),
        receipt_url: payment.receiptUrl,
        penalty_amount: payment.penaltyAmount,
        interest_amount: payment.interestAmount,
        discount_amount: payment.discountAmount,
        payment_code: payment.paymentCode,
        late_fee: payment.lateFee,
        interest: payment.interest,
        payment_location: payment.paymentLocation,
        attachments: payment.attachments,
        partial_payments: payment.partialPayments
      })
      .eq("id", payment.id)
      .select()
      .single();

    if (error) throw error;

    const item: any = data;
    return {
      id: item.id,
      rentalId: item.rental_id,
      dueDate: item.due_date,
      expectedAmount: item.expected_amount,
      paidAmount: item.paid_amount,
      paymentDate: item.payment_date,
      status: item.status,
      paymentMethod: item.payment_method,
      notes: item.notes,
      referenceMonth: Number(item.reference_month),
      referenceYear: Number(item.reference_year),
      receiptUrl: item.receipt_url,
      penaltyAmount: item.penalty_amount,
      interestAmount: item.interest_amount,
      discountAmount: item.discount_amount,
      paymentCode: item.payment_code,
      lateFee: item.late_fee ? Number(item.late_fee) : undefined,
      interest: item.interest ? Number(item.interest) : undefined,
      paymentLocation: item.payment_location,
      attachments: item.attachments,
      partialPayments: item.partial_payments,
      createdAt: item.created_at
    } as Payment;
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
      .gte("due_date", today)
      .neq("status", "paid");

    if (error) throw error;
  },

  async updateOverdueStatus(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    
    // Find pending payments that are overdue
    const { data: overduePayments, error: fetchError } = await supabase
      .from("payments")
      .select("id")
      .eq("status", "pending")
      .lt("due_date", today);
      
    if (fetchError) {
      console.error("Error fetching overdue payments:", fetchError);
      return;
    }
    
    if (overduePayments && overduePayments.length > 0) {
      const ids = overduePayments.map(p => p.id);
      
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "overdue" })
        .in("id", ids);
        
      if (updateError) {
        console.error("Error updating overdue status:", updateError);
      }
    }
  },

  async updateFuturePaymentsOnRentalValueChange(rentalId: string, newAmount: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    
    // Update only pending/overdue future payments
    const { error } = await supabase
      .from("payments")
      .update({ expected_amount: newAmount })
      .eq("rental_id", rentalId)
      .neq("status", "paid")
      .gte("due_date", today);

    if (error) throw error;
  },
  
  async updateFuturePaymentsOnPaymentDayChange(rentalId: string, newDay: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    
    // Get future unpaid payments
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rentalId)
      .neq("status", "paid")
      .gte("due_date", today);
      
    if (fetchError) throw fetchError;
    if (!payments || payments.length === 0) return;
    
    // Update each payment due date
    for (const payment of payments) {
      const currentDate = new Date(payment.due_date);
      // Create new date with same month/year but new day
      // Handle months with fewer days than newDay
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const daysInMonth = nextMonth.getDate();
      const validDay = Math.min(newDay, daysInMonth);
      
      // Format as YYYY-MM-DD
      const newDueDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
      
      await supabase
        .from("payments")
        .update({ due_date: newDueDate } as any)
        .eq("id", payment.id);
    }
  }
};