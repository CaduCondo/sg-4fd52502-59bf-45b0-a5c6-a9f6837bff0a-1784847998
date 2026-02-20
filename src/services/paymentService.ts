import { supabase } from "@/integrations/supabase/client";
import { addMonths, format, setDate, startOfMonth, endOfMonth, differenceInDays, parseISO, isSameMonth } from "date-fns";
import type { Payment, Rental, Property, Tenant } from "@/types";
import type { Tables } from "@/integrations/supabase/types";

type PaymentResponse = Tables<"payments"> & {
  rental: (Tables<"rentals"> & {
    properties: Pick<Tables<"properties">, "id" | "property_identifier" | "location_id" | "complement"> | null;
    tenants: Pick<Tables<"tenants">, "id" | "name" | "cpf" | "email" | "phone"> | null;
  }) | null;
};

export const getAll = async (): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      rental_id,
      expected_amount,
      paid_amount,
      due_date,
      payment_date,
      status,
      reference_month,
      reference_year,
      discount_amount,
      late_fee,
      interest,
      notes,
      payment_method,
      breakdown,
      installment,
      total_installments,
      rental:rentals(
        id,
        monthly_rent,
        garage_value,
        has_garage,
        payment_day,
        start_date,
        end_date,
        properties(id, property_identifier, location_id, complement),
        tenants(id, name, cpf, email, phone)
      )
    `
    )
    .order("reference_year", { ascending: false })
    .order("reference_month", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data || []).map((payment: any) => ({
    ...payment,
    dueDate: payment.due_date,
    expectedAmount: payment.expected_amount,
    paidAmount: payment.paid_amount,
    paymentDate: payment.payment_date,
    referenceMonth: Number(payment.reference_month),
    referenceYear: Number(payment.reference_year),
    discount: payment.discount_amount,
    lateFee: payment.late_fee,
    rentalId: payment.rental_id,
    paymentMethod: payment.payment_method,
    totalInstallments: payment.total_installments,
    rental: payment.rental as unknown as Rental,
    property: payment.rental?.properties as unknown as Property,
    tenant: payment.rental?.tenants as unknown as Tenant,
    propertyId: payment.rental?.properties?.id || "",
    tenantId: payment.rental?.tenants?.id || "",
    receiptUrl: undefined,
  }));
};

export const getById = async (id: string): Promise<Payment> => {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      rental:rentals(
        *,
        properties(id, property_identifier, location_id, complement, value, has_garage, garage_value),
        tenants(id, name, cpf, email, phone)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    rentalId: data.rental_id,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    dueDate: data.due_date,
    paymentDate: data.payment_date,
    status: data.status as "paid" | "pending" | "overdue" | "partial",
    referenceMonth: Number(data.reference_month),
    referenceYear: Number(data.reference_year),
    discount: data.discount_amount,
    lateFee: data.late_fee,
    interest: data.interest || 0,
    notes: data.notes,
    paymentMethod: data.payment_method,
    breakdown: data.breakdown,
    installment: data.installment,
    totalInstallments: data.total_installments,
    rental: data.rental as unknown as Rental,
    property: data.rental?.properties as unknown as Property,
    tenant: data.rental?.tenants as unknown as Tenant,
    propertyId: data.rental?.properties?.id || "",
    tenantId: data.rental?.tenants?.id || "",
    attachments: (data.attachments as unknown as string[]) || [],
  };
};

export const create = async (payment: Partial<Payment>): Promise<Payment> => {
  const insertData = {
    rental_id: payment.rentalId,
    expected_amount: payment.expectedAmount,
    paid_amount: payment.paidAmount || 0,
    due_date: payment.dueDate,
    payment_date: payment.paymentDate,
    status: payment.status || "pending",
    reference_month: String(payment.referenceMonth),
    reference_year: String(payment.referenceYear),
    discount_amount: payment.discount || 0,
    late_fee: payment.lateFee || 0,
    interest: payment.interest || 0,
    notes: payment.notes,
    payment_method: payment.paymentMethod,
    breakdown: payment.breakdown,
    installment: payment.installment,
    total_installments: payment.totalInstallments,
  };

  const { data, error } = await supabase
    .from("payments")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  
  const createdPayment: Payment = {
    id: data.id,
    rentalId: data.rental_id,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    dueDate: data.due_date,
    paymentDate: data.payment_date,
    status: data.status as "paid" | "pending" | "overdue" | "partial",
    referenceMonth: Number(data.reference_month),
    referenceYear: Number(data.reference_year),
    discount: data.discount_amount,
    lateFee: data.late_fee,
    interest: data.interest || 0,
    notes: data.notes,
    paymentMethod: data.payment_method,
    breakdown: data.breakdown,
    installment: data.installment,
    totalInstallments: data.total_installments,
    propertyId: "",
    tenantId: "",
    attachments: (data.attachments as unknown as string[]) || [],
  };

  return createdPayment;
};

export const update = async (
  id: string,
  payment: Partial<Payment>
): Promise<Payment> => {
  const updateData: any = {
    expected_amount: payment.expectedAmount,
    paid_amount: payment.paidAmount,
    due_date: payment.dueDate,
    payment_date: payment.paymentDate,
    status: payment.status,
    reference_month: payment.referenceMonth ? String(payment.referenceMonth) : undefined,
    reference_year: payment.referenceYear ? String(payment.referenceYear) : undefined,
    discount_amount: payment.discount,
    late_fee: payment.lateFee,
    interest: payment.interest,
    notes: payment.notes,
    payment_method: payment.paymentMethod,
    breakdown: payment.breakdown,
    installment: payment.installment,
    total_installments: payment.totalInstallments,
  };

  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  const { data, error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return { 
    id: data.id,
    rentalId: data.rental_id,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    dueDate: data.due_date,
    paymentDate: data.payment_date,
    status: data.status as "paid" | "pending" | "overdue" | "partial",
    referenceMonth: Number(data.reference_month),
    referenceYear: Number(data.reference_year),
    discount: data.discount_amount,
    lateFee: data.late_fee,
    interest: data.interest || 0,
    notes: data.notes,
    paymentMethod: data.payment_method,
    breakdown: data.breakdown,
    installment: data.installment,
    totalInstallments: data.total_installments,
    propertyId: "",
    tenantId: "",
    attachments: (data.attachments as unknown as string[]) || [],
  } as Payment;
};

export const remove = async (id: string): Promise<void> => {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
};

export const deletePaymentsByRentalId = async (rentalId: string): Promise<void> => {
  const { error } = await supabase.from("payments").delete().eq("rental_id", rentalId);
  if (error) throw error;
};

export const createPaymentsForRental = async (params: {
  rental: Rental;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  paymentDay: number;
  hasGarage: boolean;
  garageValue: number;
  firstPaymentMonth?: "current" | "next";
}): Promise<void> => {
  const {
    rental,
    startDate,
    endDate,
    monthlyRent,
    paymentDay,
    hasGarage,
    garageValue,
    firstPaymentMonth = "current",
  } = params;

  const payments: any[] = [];
  const fullMonthlyAmount = monthlyRent + (hasGarage ? garageValue : 0);
  
  const now = new Date();
  let firstPaymentDate: Date;
  
  if (firstPaymentMonth === "next") {
    firstPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    firstPaymentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const contractStartMonth = startOfMonth(startDate);
  const contractEndMonth = startOfMonth(endDate);
  
  let currentPaymentMonth = firstPaymentDate;
  let installmentNumber = 1;
  const allPaymentMonths: Date[] = [];

  while (currentPaymentMonth <= contractEndMonth) {
    allPaymentMonths.push(new Date(currentPaymentMonth));
    currentPaymentMonth = addMonths(currentPaymentMonth, 1);
  }

  const totalInstallments = allPaymentMonths.length;

  for (let i = 0; i < allPaymentMonths.length; i++) {
    const paymentMonth = allPaymentMonths[i];
    const isFirstPayment = i === 0;
    const isLastPayment = i === allPaymentMonths.length - 1;
    
    const dueDate = setDate(paymentMonth, Math.min(paymentDay, 28));
    let expectedAmount = fullMonthlyAmount;
    let rentAmount = monthlyRent;
    let garageAmount = hasGarage ? garageValue : 0;
    let isProporcional = false;

    const breakdown = [
      {
        description: "Aluguel",
        value: rentAmount,
      },
    ];

    if (hasGarage && garageValue > 0) {
      breakdown.push({
        description: "Garagem",
        value: garageAmount,
      });
    }

    if (isFirstPayment) {
      const daysToCharge = differenceInDays(endOfMonth(startDate), startDate) + 1;
      
      if (daysToCharge < 30) {
        isProporcional = true;
        const totalValue = monthlyRent + (hasGarage ? garageValue : 0);
        expectedAmount = parseFloat(((totalValue * daysToCharge) / 30).toFixed(2));
        rentAmount = parseFloat(((monthlyRent * daysToCharge) / 30).toFixed(2));
        garageAmount = hasGarage ? parseFloat(((garageValue * daysToCharge) / 30).toFixed(2)) : 0;

        breakdown[0] = {
          description: "Aluguel (proporcional)",
          value: rentAmount,
        };

        if (hasGarage && garageValue > 0) {
          breakdown[1] = {
            description: "Garagem (proporcional)",
            value: garageAmount,
          };
        }
      }
    } else if (isLastPayment) {
      const monthStart = startOfMonth(paymentMonth);
      const daysToCharge = differenceInDays(endDate, monthStart) + 1;
      
      if (daysToCharge < 30) {
        isProporcional = true;
        const totalValue = monthlyRent + (hasGarage ? garageValue : 0);
        expectedAmount = parseFloat(((totalValue * daysToCharge) / 30).toFixed(2));
        rentAmount = parseFloat(((monthlyRent * daysToCharge) / 30).toFixed(2));
        garageAmount = hasGarage ? parseFloat(((garageValue * daysToCharge) / 30).toFixed(2)) : 0;

        breakdown[0] = {
          description: "Aluguel (proporcional)",
          value: rentAmount,
        };

        if (hasGarage && garageValue > 0) {
          breakdown[1] = {
            description: "Garagem (proporcional)",
            value: garageAmount,
          };
        }
      }
    }

    payments.push({
      rental_id: rental.id,
      expected_amount: expectedAmount,
      paid_amount: 0,
      due_date: format(dueDate, "yyyy-MM-dd"),
      status: "pending",
      reference_month: paymentMonth.getMonth() + 1,
      reference_year: paymentMonth.getFullYear(),
      breakdown,
      discount_amount: 0,
      late_fee: 0,
      interest: 0,
      notes: isProporcional ? "Pagamento proporcional" : null,
      installment: installmentNumber,
      total_installments: totalInstallments,
    });

    installmentNumber++;
  }

  const { error } = await supabase.from("payments").insert(payments);

  if (error) throw error;
};

export const updateFuturePayments = async (
  rentalId: string,
  newAmount: number,
  rental: Rental
): Promise<void> => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: futurePayments, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .or(
      `reference_year.gt.${currentYear},and(reference_year.eq.${currentYear},reference_month.gte.${currentMonth})`
    );

  if (fetchError) throw fetchError;

  if (!futurePayments || futurePayments.length === 0) return;

  const updates = futurePayments.map((payment) => {
    const breakdown = [
      {
        description: "Aluguel",
        value: newAmount,
      },
    ];

    if (rental.hasGarage && rental.garageValue > 0) {
      breakdown.push({
        description: "Garagem",
        value: rental.garageValue,
      });
    }

    const hasGarage = (rental as any).has_garage || rental.hasGarage;
    const garageValue = (rental as any).garage_value || rental.garageValue || 0;

    const expectedAmount = newAmount + (hasGarage ? garageValue : 0);

    return {
      id: payment.id,
      expected_amount: expectedAmount,
      breakdown,
    };
  });

  for (const update of updates) {
    const { error } = await supabase
      .from("payments")
      .update({
        expected_amount: update.expected_amount,
        breakdown: update.breakdown,
      })
      .eq("id", update.id);

    if (error) throw error;
  }
};

export const updateFuturePaymentsOnPaymentDayChange = async (
  rentalId: string,
  newPaymentDay: number
): Promise<void> => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: futurePayments, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .or(
      `reference_year.gt.${currentYear},and(reference_year.eq.${currentYear},reference_month.gte.${currentMonth})`
    );

  if (fetchError) throw fetchError;

  if (!futurePayments || futurePayments.length === 0) return;

  const updates = futurePayments.map((payment) => {
    const refYear = typeof payment.reference_year === 'string' ? parseInt(payment.reference_year) : payment.reference_year;
    const refMonth = typeof payment.reference_month === 'string' ? parseInt(payment.reference_month) : payment.reference_month;

    const dueDate = setDate(
      new Date(refYear, refMonth - 1, 1),
      Math.min(newPaymentDay, 28)
    );

    return {
      id: payment.id,
      due_date: format(dueDate, "yyyy-MM-dd"),
    };
  });

  for (const update of updates) {
    const { error } = await supabase
      .from("payments")
      .update({ due_date: update.due_date })
      .eq("id", update.id);

    if (error) throw error;
  }
};

export const updatePendingPaymentsOnRentalEdit = async (
  rentalId: string,
  updates: Partial<{
    monthlyRent: number;
    paymentDay: number;
    hasGarage: boolean;
    garageValue: number;
  }>,
  rental: Rental
): Promise<void> => {
  if (updates.monthlyRent !== undefined) {
    await updateFuturePayments(rentalId, updates.monthlyRent, rental);
  }

  if (updates.paymentDay !== undefined) {
    await updateFuturePaymentsOnPaymentDayChange(rentalId, updates.paymentDay);
  }
};

export const migrateProportionalFirstPayments = async () => {
  console.log("Migration requested");
  return { success: true, count: 0 };
};