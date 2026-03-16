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

/**
 * NOVA LÓGICA DE GERAÇÃO DE RECEBIMENTOS
 * 
 * Regras:
 * 1. Primeiro recebimento (sempre parcela 1/XX):
 *    - Se dia_inicio <= dia_vencimento: criar no mesmo mês, proporcional
 *    - Se dia_inicio > dia_vencimento: criar no mês seguinte, proporcional (~30 dias)
 * 
 * 2. Recebimentos intermediários: valor integral, 1 por mês
 * 
 * 3. Último recebimento: proporcional aos dias do último mês
 * 
 * 4. Não pular meses, não duplicar meses
 */
export function generateExpectedPayments(params: {
  rentalId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  monthlyRent: number;
  paymentDay: number;
  hasGarage?: boolean;
  garageValue?: number;
}) {
  const { rentalId, startDate, endDate, monthlyRent, paymentDay, hasGarage, garageValue } = params;
  
  console.log("🔄 [generateExpectedPayments] Iniciando geração de recebimentos:", {
    rentalId,
    startDate,
    endDate,
    monthlyRent,
    paymentDay,
    hasGarage,
    garageValue
  });
  
  const rentValue = monthlyRent;
  const garage = hasGarage && garageValue ? garageValue : 0;
  const totalMonthlyValue = rentValue + garage;

  const paymentsToCreate: any[] = [];
  
  // Parse das datas
  const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
  
  console.log("📅 Datas parseadas:", { sYear, sMonth, sDay, eYear, eMonth, eDay });

  // **ETAPA 1: Determinar o primeiro mês de cobrança**
  let firstPaymentMonth: number;
  let firstPaymentYear: number;
  let daysToChargeFirstPayment: number;
  
  if (sDay <= paymentDay) {
    // Primeiro recebimento no mesmo mês do início do contrato
    firstPaymentMonth = sMonth;
    firstPaymentYear = sYear;
    daysToChargeFirstPayment = paymentDay - sDay + 1;
    console.log("✅ Primeiro recebimento no MESMO mês:", { firstPaymentMonth, firstPaymentYear, daysToChargeFirstPayment });
  } else {
    // Primeiro recebimento no mês seguinte
    firstPaymentMonth = sMonth === 12 ? 1 : sMonth + 1;
    firstPaymentYear = sMonth === 12 ? sYear + 1 : sYear;
    
    // Calcular dias: do dia_inicio até o final do mês + do início do próximo mês até o dia_vencimento
    const daysInStartMonth = new Date(sYear, sMonth, 0).getDate();
    const daysUntilEndOfStartMonth = daysInStartMonth - sDay + 1;
    daysToChargeFirstPayment = daysUntilEndOfStartMonth + paymentDay;
    
    console.log("✅ Primeiro recebimento no PRÓXIMO mês:", { 
      firstPaymentMonth, 
      firstPaymentYear, 
      daysToChargeFirstPayment,
      daysUntilEndOfStartMonth,
      daysInNextMonth: paymentDay
    });
  }

  // **ETAPA 2: Criar o primeiro recebimento (sempre parcela 1/XX)**
  const firstPaymentDueDate = `${firstPaymentYear}-${String(firstPaymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
  
  const proportionalRent = (rentValue / 30) * daysToChargeFirstPayment;
  const proportionalGarage = garage > 0 ? (garage / 30) * daysToChargeFirstPayment : 0;
  const firstPaymentAmount = proportionalRent + proportionalGarage;

  const firstPaymentBreakdown: Array<{ description: string; amount: number; type: string }> = [
    {
      description: `Aluguel - Parcela 1 (${daysToChargeFirstPayment} dias)`,
      amount: parseFloat(proportionalRent.toFixed(2)),
      type: "addition",
    }
  ];

  if (garage > 0) {
    firstPaymentBreakdown.push({
      description: `Garagem Proporcional (${daysToChargeFirstPayment} dias)`,
      amount: parseFloat(proportionalGarage.toFixed(2)),
      type: "addition",
    });
  }

  paymentsToCreate.push({
    rental_id: rentalId,
    reference_month: firstPaymentMonth,
    reference_year: firstPaymentYear,
    due_date: firstPaymentDueDate,
    expected_amount: parseFloat(firstPaymentAmount.toFixed(2)),
    status: "pending",
    breakdown: firstPaymentBreakdown,
    installment: 1,
  });

  console.log("📝 Primeiro recebimento criado:", paymentsToCreate[0]);

  // **ETAPA 3: Criar recebimentos intermediários (valor integral)**
  let currentMonth = firstPaymentMonth + 1;
  let currentYear = firstPaymentYear;
  
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  }

  let installmentNumber = 2; // Começa da parcela 2

  // Loop até o penúltimo mês (o último será tratado separadamente)
  while (
    currentYear < eYear || 
    (currentYear === eYear && currentMonth < eMonth)
  ) {
    const dueDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
    
    const breakdown: Array<{ description: string; amount: number; type: string }> = [
      {
        description: "Aluguel",
        amount: parseFloat(rentValue.toFixed(2)),
        type: "addition",
      }
    ];

    if (garage > 0) {
      breakdown.push({
        description: "Garagem",
        amount: parseFloat(garage.toFixed(2)),
        type: "addition",
      });
    }

    paymentsToCreate.push({
      rental_id: rentalId,
      reference_month: currentMonth,
      reference_year: currentYear,
      due_date: dueDate,
      expected_amount: parseFloat(totalMonthlyValue.toFixed(2)),
      status: "pending",
      breakdown: breakdown,
      installment: installmentNumber,
    });

    console.log(`📝 Recebimento intermediário criado - Parcela ${installmentNumber}:`, {
      month: currentMonth,
      year: currentYear,
      amount: totalMonthlyValue
    });

    installmentNumber++;
    currentMonth++;
    
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  // **ETAPA 4: Criar o último recebimento (proporcional)**
  if (currentYear === eYear && currentMonth === eMonth) {
    const daysToChargeLastPayment = eDay;
    
    const lastProportionalRent = (rentValue / 30) * daysToChargeLastPayment;
    const lastProportionalGarage = garage > 0 ? (garage / 30) * daysToChargeLastPayment : 0;
    const lastPaymentAmount = lastProportionalRent + lastProportionalGarage;

    const lastDueDate = `${eYear}-${String(eMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;

    const lastPaymentBreakdown: Array<{ description: string; amount: number; type: string }> = [
      {
        description: `Aluguel - Última Parcela (${daysToChargeLastPayment} dias)`,
        amount: parseFloat(lastProportionalRent.toFixed(2)),
        type: "addition",
      }
    ];

    if (garage > 0) {
      lastPaymentBreakdown.push({
        description: `Garagem Proporcional (${daysToChargeLastPayment} dias)`,
        amount: parseFloat(lastProportionalGarage.toFixed(2)),
        type: "addition",
      });
    }

    paymentsToCreate.push({
      rental_id: rentalId,
      reference_month: eMonth,
      reference_year: eYear,
      due_date: lastDueDate,
      expected_amount: parseFloat(lastPaymentAmount.toFixed(2)),
      status: "pending",
      breakdown: lastPaymentBreakdown,
      installment: installmentNumber,
    });

    console.log(`📝 Último recebimento criado - Parcela ${installmentNumber}:`, {
      month: eMonth,
      year: eYear,
      days: daysToChargeLastPayment,
      amount: lastPaymentAmount
    });
  }

  // **ETAPA 5: Adicionar total_installments a todos os recebimentos**
  const totalInstallments = paymentsToCreate.length;
  
  paymentsToCreate.forEach(payment => {
    payment.total_installments = totalInstallments;
  });

  console.log("✅ [generateExpectedPayments] Recebimentos gerados:", {
    total: totalInstallments,
    payments: paymentsToCreate.map(p => ({
      month: p.reference_month,
      year: p.reference_year,
      installment: p.installment,
      amount: p.expected_amount
    }))
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

/**
 * Identifica e remove recebimentos duplicados
 * Duplicatas = mesmo rental_id + reference_month + reference_year
 */
export async function findAndRemoveDuplicatePayments(): Promise<{
  success: boolean;
  duplicatesFound: number;
  duplicatesRemoved: number;
  details: Array<{
    rentalId: string;
    month: number;
    year: number;
    total: number;
    kept: string;
    removed: string[];
  }>;
  errors: string[];
}> {
  const details: Array<{
    rentalId: string;
    month: number;
    year: number;
    total: number;
    kept: string;
    removed: string[];
  }> = [];
  
  const errors: string[] = [];
  let duplicatesRemoved = 0;

  try {
    // Buscar todos os recebimentos
    const { data: allPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: true });

    if (paymentsError) throw paymentsError;
    if (!allPayments || allPayments.length === 0) {
      return { success: true, duplicatesFound: 0, duplicatesRemoved: 0, details: [], errors: [] };
    }

    // Agrupar por rental_id + reference_month + reference_year
    const grouped = new Map<string, any[]>();
    
    for (const payment of allPayments) {
      const key = `${payment.rental_id}-${payment.reference_month}-${payment.reference_year}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(payment);
    }

    // Processar grupos com duplicatas
    for (const [key, payments] of grouped.entries()) {
      if (payments.length <= 1) continue; // Não é duplicata

      console.log(`🔍 Duplicata encontrada: ${key} (${payments.length} recebimentos)`);

      // Ordenar por prioridade:
      // 1. Status 'paid' (mantém sempre)
      // 2. created_at mais recente
      const sorted = payments.sort((a, b) => {
        // Priorizar pagos
        if (a.status === "paid" && b.status !== "paid") return -1;
        if (a.status !== "paid" && b.status === "paid") return 1;
        
        // Se ambos são paid ou ambos não são, usar created_at (mais recente primeiro)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const toKeep = sorted[0];
      const toRemove = sorted.slice(1);

      console.log(`✅ Mantendo: ${toKeep.id} (${toKeep.status}) - Parcela ${toKeep.installment}/${toKeep.total_installments}`);
      console.log(`❌ Removendo: ${toRemove.map(p => `${p.id} (${p.status}) - Parcela ${p.installment}/${p.total_installments}`).join(", ")}`);

      // Deletar os duplicados
      for (const payment of toRemove) {
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("id", payment.id);

        if (deleteError) {
          errors.push(`Erro ao deletar ${payment.id}: ${deleteError.message}`);
          console.error(`❌ Erro ao deletar ${payment.id}:`, deleteError);
        } else {
          duplicatesRemoved++;
          console.log(`✅ Deletado: ${payment.id}`);
        }
      }

      details.push({
        rentalId: toKeep.rental_id,
        month: Number(toKeep.reference_month),
        year: Number(toKeep.reference_year),
        total: payments.length,
        kept: toKeep.id,
        removed: toRemove.map(p => p.id),
      });
    }

    return {
      success: true,
      duplicatesFound: details.length,
      duplicatesRemoved,
      details,
      errors,
    };
  } catch (error: any) {
    console.error("Erro ao buscar duplicatas:", error);
    return {
      success: false,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      details: [],
      errors: [error.message],
    };
  }
}