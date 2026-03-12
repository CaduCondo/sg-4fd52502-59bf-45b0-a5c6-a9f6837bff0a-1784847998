import { supabase } from "@/integrations/supabase/client";
import { format, setDate } from "date-fns";
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
        rent_value,
        has_garage,
        rent_due_day,
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
        properties(id, property_identifier, location_id, complement, value, has_garage),
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

export function generateExpectedPayments(params: {
  rentalId: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string; // ISO string YYYY-MM-DD
  monthlyRent: number;
  paymentDay: number;
  hasGarage?: boolean;
  garageValue?: number;
}) {
  const { rentalId, startDate, endDate, monthlyRent, paymentDay, hasGarage, garageValue } = params;
  
  const rentValue = monthlyRent;
  const garage = hasGarage && garageValue ? garageValue : 0;
  const totalMonthlyValue = rentValue + garage;

  const paymentsToCreate: any[] = [];
  
  const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
  
  let currentMonth = sMonth;
  let currentYear = sYear;
  
  let installmentNumber = 0;
  
  while (
    currentYear < eYear || 
    (currentYear === eYear && currentMonth <= eMonth)
  ) {
    const refMonth = currentMonth;
    const refYear = currentYear;

    const daysInMonth = new Date(refYear, refMonth, 0).getDate();
    let dueDateDay: number;
    let expectedAmount: number;
    const breakdown: Array<{ description: string; amount: number; type: string }> = [];

    const isFirstMonthOfContract = (currentYear === sYear && currentMonth === sMonth);
    const isLastMonthOfContract = (currentYear === eYear && currentMonth === eMonth);

    if (isFirstMonthOfContract && sDay > 1) {
      let daysToCharge: number;
      
      if (sDay <= paymentDay) {
        dueDateDay = Math.min(paymentDay, daysInMonth);
        daysToCharge = dueDateDay - sDay + 1;
      } else {
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
        dueDateDay = Math.min(paymentDay, daysInNextMonth);
        daysToCharge = dueDateDay;
      }
      
      const dueMonth = sDay <= paymentDay ? refMonth : (refMonth === 12 ? 1 : refMonth + 1);
      const dueYear = sDay <= paymentDay ? refYear : (refMonth === 12 ? refYear + 1 : refYear);
      
      const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDateDay).padStart(2, '0')}`;

      const proportionalRent = (rentValue / 30) * daysToCharge;
      const proportionalGarage = garage > 0 ? (garage / 30) * daysToCharge : 0;
      expectedAmount = proportionalRent + proportionalGarage;

      const isProrata = daysToCharge < 15;
      
      if (isProrata) {
        installmentNumber = 0;
        breakdown.push({
          description: `Prorata (${daysToCharge} dias)`,
          amount: parseFloat(proportionalRent.toFixed(2)),
          type: "addition",
        });
        if (garage > 0) {
          breakdown.push({
            description: `Garagem Proporcional (${daysToCharge} dias)`,
            amount: parseFloat(proportionalGarage.toFixed(2)),
            type: "addition",
          });
        }
      } else {
        installmentNumber = 1;
        breakdown.push({
          description: `Aluguel Proporcional - 1ª Parcela (${daysToCharge} dias)`,
          amount: parseFloat(proportionalRent.toFixed(2)),
          type: "addition",
        });
        if (garage > 0) {
          breakdown.push({
            description: `Garagem Proporcional (${daysToCharge} dias)`,
            amount: parseFloat(proportionalGarage.toFixed(2)),
            type: "addition",
          });
        }
      }
      
      paymentsToCreate.push({
        rental_id: rentalId,
        reference_month: refMonth,
        reference_year: refYear,
        due_date: dueDate,
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
      });
      
    } else if (isLastMonthOfContract && eDay < daysInMonth) {
      dueDateDay = Math.min(paymentDay, daysInMonth);
      const dueDate = `${refYear}-${String(refMonth).padStart(2, '0')}-${String(dueDateDay).padStart(2, '0')}`;
      
      const daysToCharge = eDay;
      const proportionalRent = (rentValue / 30) * daysToCharge;
      const proportionalGarage = garage > 0 ? (garage / 30) * daysToCharge : 0;
      expectedAmount = proportionalRent + proportionalGarage;

      installmentNumber++;
      
      breakdown.push({
        description: `Aluguel Proporcional - Última Parcela (${daysToCharge} dias)`,
        amount: parseFloat(proportionalRent.toFixed(2)),
        type: "addition",
      });

      if (garage > 0) {
        breakdown.push({
          description: `Garagem Proporcional (${daysToCharge} dias)`,
          amount: parseFloat(proportionalGarage.toFixed(2)),
          type: "addition",
        });
      }
      
      paymentsToCreate.push({
        rental_id: rentalId,
        reference_month: refMonth,
        reference_year: refYear,
        due_date: dueDate,
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
      });
      
    } else {
      dueDateDay = Math.min(paymentDay, daysInMonth);
      const dueDate = `${refYear}-${String(refMonth).padStart(2, '0')}-${String(dueDateDay).padStart(2, '0')}`;
      expectedAmount = totalMonthlyValue;

      installmentNumber++;

      breakdown.push({
        description: "Aluguel",
        amount: parseFloat(rentValue.toFixed(2)),
        type: "addition",
      });

      if (garage > 0) {
        breakdown.push({
          description: "Garagem",
          amount: parseFloat(garage.toFixed(2)),
          type: "addition",
        });
      }
      
      paymentsToCreate.push({
        rental_id: rentalId,
        reference_month: refMonth,
        reference_year: refYear,
        due_date: dueDate,
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
      });
    }

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  const totalInstallments = paymentsToCreate.filter(p => p.installment > 0).length;
  
  paymentsToCreate.forEach(payment => {
    payment.total_installments = totalInstallments;
  });

  return paymentsToCreate;
}

export async function createPaymentsForRental(params: {
  rental: Rental;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  paymentDay: number;
  hasGarage?: boolean;
  garageValue?: number;
}): Promise<void> {
  const { rental, startDate, endDate, monthlyRent, paymentDay, hasGarage, garageValue } = params;

  const expectedPayments = generateExpectedPayments({
    rentalId: rental.id,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    monthlyRent,
    paymentDay,
    hasGarage,
    garageValue
  });

  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id, reference_month, reference_year")
    .eq("rental_id", rental.id);

  const existingRefs = new Set(
    (existingPayments || []).map((p) => `${p.reference_year}-${p.reference_month}`)
  );

  const paymentsToCreate = expectedPayments.filter(
    p => !existingRefs.has(`${p.reference_year}-${p.reference_month}`)
  );

  if (paymentsToCreate.length > 0) {
    const { error } = await supabase.from("payments").insert(paymentsToCreate);
    if (error) throw error;
  }
}

export async function updateFuturePayments(
  rentalId: string,
  newTotalValue: number,
  rental: Rental
): Promise<void> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const { data: futurePayments, error } = await supabase
    .from("payments")
    .select("id, reference_month, reference_year, breakdown, status")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .or(`reference_year.gt.${currentYear},and(reference_year.eq.${currentYear},reference_month.gte.${currentMonth})`);

  if (error) throw error;
  if (!futurePayments || futurePayments.length === 0) return;

  const baseRent = rental.monthlyRent || rental.value || 0;
  const garage = rental.hasGarage && rental.garageValue ? rental.garageValue : 0;

  const updates = futurePayments.map((payment) => {
    const breakdown = [
      {
        description: "Aluguel",
        amount: parseFloat(baseRent.toFixed(2)),
        type: "addition",
      },
    ];

    if (rental.hasGarage && garage > 0) {
      breakdown.push({
        description: "Garagem",
        amount: parseFloat(garage.toFixed(2)),
        type: "addition",
      });
    }

    return {
      id: payment.id,
      expected_amount: parseFloat(newTotalValue.toFixed(2)),
      breakdown: breakdown,
    };
  });

  await Promise.all(
    updates.map(async (update) => {
      const { error } = await supabase
        .from("payments")
        .update({
          expected_amount: update.expected_amount,
          breakdown: update.breakdown,
        })
        .eq("id", update.id);
      
      if (error) throw error;
    })
  );
}

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

export async function analyzeAllRentalsPayments(): Promise<{
  success: boolean;
  totalRentals: number;
  problems: { rentalId: string; propertyName: string; reason: string }[];
  errors: string[];
}> {
  const problems: { rentalId: string; propertyName: string; reason: string }[] = [];

  try {
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select(`
        id,
        start_date,
        end_date,
        rent_value,
        rent_due_day,
        has_garage,
        garage_value,
        status,
        properties(property_identifier)
      `)
      .in("status", ["active", "ended"]);

    if (rentalsError) throw rentalsError;
    if (!rentals) return { success: true, totalRentals: 0, problems: [], errors: [] };

    for (const rental of rentals) {
      const propertyName = rental.properties?.property_identifier || "Sem identificação";
      
      const expected = generateExpectedPayments({
          rentalId: rental.id,
          startDate: rental.start_date,
          endDate: rental.end_date,
          monthlyRent: rental.rent_value || 0,
          paymentDay: rental.rent_due_day || 5,
          hasGarage: rental.has_garage || false,
          garageValue: rental.garage_value || 0,
      });
      
      const { data: existing } = await supabase.from("payments").select("*").eq("rental_id", rental.id);
      
      if (!existing || existing.length === 0) {
          problems.push({ rentalId: rental.id, propertyName, reason: "Nenhum recebimento encontrado" });
          continue;
      }
      
      if (expected.length !== existing.length) {
          problems.push({ rentalId: rental.id, propertyName, reason: `Quantidade de meses divergente (Esperado: ${expected.length}, Atual: ${existing.length})` });
          continue;
      }
      
      let hasMismatch = false;
      for (const exp of expected) {
          const match = existing.find(ex => String(ex.reference_month) === String(exp.reference_month) && String(ex.reference_year) === String(exp.reference_year));
          if (!match) {
              hasMismatch = true;
              break;
          }
          if (match.installment !== exp.installment) {
              hasMismatch = true;
              break;
          }
          if (match.total_installments !== exp.total_installments) {
              hasMismatch = true;
              break;
          }
      }
      
      if (hasMismatch) {
          problems.push({ rentalId: rental.id, propertyName, reason: "Inconsistência nos meses ou numeração de parcelas incorreta" });
      }
    }

    return { success: true, totalRentals: rentals.length, problems, errors: [] };
  } catch (error: any) {
    console.error("Erro ao analisar pagamentos:", error);
    return { success: false, totalRentals: 0, problems: [], errors: [error.message] };
  }
}

export async function fixSpecificRentalPayments(rentalId: string): Promise<boolean> {
  try {
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select(`
        id,
        start_date,
        end_date,
        rent_value,
        rent_due_day,
        has_garage,
        garage_value
      `)
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) throw rentalError;

    const expected = generateExpectedPayments({
      rentalId: rental.id,
      startDate: rental.start_date,
      endDate: rental.end_date,
      monthlyRent: rental.rent_value || 0,
      paymentDay: rental.rent_due_day || 5,
      hasGarage: rental.has_garage || false,
      garageValue: rental.garage_value || 0,
    });
      
    const { data: existing } = await supabase.from("payments").select("*").eq("rental_id", rentalId);
    const currentPayments = existing || [];

    // Updates or Inserts without touching payment status or attachments
    for (const exp of expected) {
      const match = currentPayments.find(ex => String(ex.reference_month) === String(exp.reference_month) && String(ex.reference_year) === String(exp.reference_year));
      
      if (match) {
        await supabase.from("payments").update({
            installment: exp.installment,
            total_installments: exp.total_installments,
            expected_amount: exp.expected_amount,
            breakdown: exp.breakdown,
            due_date: exp.due_date
        }).eq("id", match.id);
      } else {
        await supabase.from("payments").insert([exp]);
      }
    }
    
    // Remove strictly what is completely out of bounds for the contract
    for (const ex of currentPayments) {
      const isExpected = expected.find(exp => String(exp.reference_month) === String(ex.reference_month) && String(exp.reference_year) === String(ex.reference_year));
      if (!isExpected) {
          await supabase.from("payments").delete().eq("id", ex.id);
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao corrigir recebimentos da locação:", error);
    return false;
  }
}