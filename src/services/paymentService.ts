import { supabase } from "@/integrations/supabase/client";
import { addMonths, format, setDate, startOfMonth, endOfMonth, differenceInDays, parseISO, isSameMonth, differenceInMonths } from "date-fns";
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

  console.log("🔧 createPaymentsForRental - INICIANDO:", {
    rentalId: rental.id,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    monthlyRent,
    paymentDay,
    hasGarage,
    garageValue,
  });

  // ✅ PERFORMANCE: Buscar pagamentos existentes com select específico
  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id, reference_month, reference_year")
    .eq("rental_id", rental.id);

  const existingRefs = new Set(
    (existingPayments || []).map((p) => `${p.reference_year}-${p.reference_month}`)
  );

  const rentValue = monthlyRent;
  const garage = hasGarage && garageValue ? garageValue : 0;
  const totalMonthlyValue = rentValue + garage;

  // 🎯 REGRA DO PRIMEIRO RECEBIMENTO:
  // Calcular quantos dias tem entre start_date e o primeiro payment_day
  const startDay = startDate.getDate();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  
  // Determinar a data do primeiro vencimento
  let firstDueDate: Date;
  if (startDay <= paymentDay) {
    // Primeiro vencimento no mesmo mês
    firstDueDate = new Date(startYear, startMonth, paymentDay);
  } else {
    // Primeiro vencimento no mês seguinte
    firstDueDate = new Date(startYear, startMonth + 1, paymentDay);
  }
  
  // Calcular dias do primeiro período (de start_date até primeiro vencimento)
  const daysFirstPeriod = Math.ceil((firstDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  console.log("📅 Análise do Primeiro Período:", {
    startDay,
    paymentDay,
    firstDueDate: firstDueDate.toISOString().split("T")[0],
    daysFirstPeriod,
    isProrataOnly: daysFirstPeriod <= 15,
  });

  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  // ✅ PERFORMANCE: Coletar todos os pagamentos em array para batch insert
  const paymentsToCreate: any[] = [];
  
  // Determinar se o primeiro pagamento é "Prorata" (≤15 dias) ou "1/XX" (≥16 dias)
  const isFirstProrataOnly = daysFirstPeriod <= 15;
  let installmentNumber = isFirstProrataOnly ? 0 : 1; // Se for prorata puro, começa em 0

  while (currentDate <= end) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const refKey = `${year}-${month}`;

    if (existingRefs.has(refKey)) {
      console.log(`⏭️  Pulando ${month}/${year} - já existe`);
      currentDate.setMonth(currentDate.getMonth() + 1);
      continue;
    }

    const isFirstMonth = currentDate.getTime() === startDate.getTime();
    const isLastMonth = currentDate.getMonth() === end.getMonth() && currentDate.getFullYear() === end.getFullYear();

    const daysInMonth = new Date(year, month, 0).getDate();
    let dueDate = new Date(year, month - 1, Math.min(paymentDay, daysInMonth));
    let expectedAmount = totalMonthlyValue;
    const breakdown: Array<{ description: string; amount: number; type: string }> = [];

    // Cálculo proporcional (primeira parcela)
    if (isFirstMonth && startDate.getDate() > 1) {
      const startDay = startDate.getDate();
      let actualDueDay = paymentDay;
      if (startDay > paymentDay) {
        dueDate = new Date(year, month, Math.min(paymentDay, new Date(year, month + 1, 0).getDate()));
        actualDueDay = paymentDay;
      }

      const daysToCharge = actualDueDay - startDay + 1;
      const proportionalRent = (rentValue / 30) * daysToCharge;
      const proportionalGarage = hasGarage && garage ? (garage / 30) * daysToCharge : 0;
      expectedAmount = proportionalRent + proportionalGarage;

      // 🎯 DETERMINAR DESCRIÇÃO BASEADO NA REGRA
      const descriptionPrefix = daysToCharge <= 15 ? "Prorata" : "Aluguel Proporcional";
      
      breakdown.push({
        description: `${descriptionPrefix} (${daysToCharge} dias - ${startDate.toISOString().split("T")[0]} até ${dueDate.toISOString().split("T")[0]})`,
        amount: parseFloat(proportionalRent.toFixed(2)),
        type: "addition",
      });

      if (hasGarage && proportionalGarage > 0) {
        breakdown.push({
          description: `Garagem Proporcional (${daysToCharge} dias)`,
          amount: parseFloat(proportionalGarage.toFixed(2)),
          type: "addition",
        });
      }
      
      // 🎯 Se for prorata puro (≤15 dias), installment = 0 (não conta como parcela)
      paymentsToCreate.push({
        rental_id: rental.id,
        reference_month: month,
        reference_year: year,
        due_date: dueDate.toISOString().split("T")[0],
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
        total_installments: null, // Será calculado no final
      });
      
      // Se foi prorata puro (≤15 dias), próxima parcela será 1/XX
      // Se foi ≥16 dias, já contou como 1/XX
      installmentNumber++;
      
    } else {
      // Pagamentos normais (não é primeiro mês)
      breakdown.push({
        description: "Aluguel",
        amount: parseFloat(rentValue.toFixed(2)),
        type: "addition",
      });

      if (hasGarage && garage > 0) {
        breakdown.push({
          description: "Garagem",
          amount: parseFloat(garage.toFixed(2)),
          type: "addition",
        });
      }
      
      paymentsToCreate.push({
        rental_id: rental.id,
        reference_month: month,
        reference_year: year,
        due_date: dueDate.toISOString().split("T")[0],
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
        total_installments: null, // Será calculado no final
      });
      
      installmentNumber++;
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // 🎯 CALCULAR TOTAL_INSTALLMENTS CORRETO
  // Total = número de pagamentos - 1 se houver prorata (installment = 0)
  const hasProrata = paymentsToCreate.some(p => p.installment === 0);
  const totalInstallments = paymentsToCreate.length - (hasProrata ? 1 : 0);
  
  console.log("📊 Resumo dos Pagamentos:", {
    totalPayments: paymentsToCreate.length,
    hasProrata: hasProrata,
    totalInstallments: totalInstallments,
    firstInstallment: paymentsToCreate[0]?.installment,
    lastInstallment: paymentsToCreate[paymentsToCreate.length - 1]?.installment,
  });
  
  // Atualizar total_installments em todos os pagamentos
  paymentsToCreate.forEach(payment => {
    payment.total_installments = totalInstallments;
  });

  // ✅ PERFORMANCE: Batch insert único em vez de loop
  if (paymentsToCreate.length > 0) {
    console.log(`💾 Criando ${paymentsToCreate.length} pagamentos em lote...`);
    const { error } = await supabase.from("payments").insert(paymentsToCreate);

    if (error) {
      console.error("❌ Erro ao criar pagamentos:", error);
      throw error;
    }

    console.log(`✅ ${paymentsToCreate.length} pagamentos criados com sucesso`);
  } else {
    console.log("ℹ️  Nenhum pagamento novo para criar");
  }
}

export async function updateFuturePayments(
  rentalId: string,
  newTotalValue: number,
  rental: Rental
): Promise<void> {
  console.log("🔧 updateFuturePayments - INICIANDO:", { rentalId, newTotalValue });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // ✅ PERFORMANCE: Select específico apenas dos campos necessários
  const { data: futurePayments, error } = await supabase
    .from("payments")
    .select("id, reference_month, reference_year, breakdown, status")
    .eq("rental_id", rentalId)
    .eq("status", "pending")
    .or(`reference_year.gt.${currentYear},and(reference_year.eq.${currentYear},reference_month.gte.${currentMonth})`);

  if (error) {
    console.error("❌ Erro ao buscar pagamentos futuros:", error);
    throw error;
  }

  if (!futurePayments || futurePayments.length === 0) {
    console.log("ℹ️  Nenhum pagamento futuro para atualizar");
    return;
  }

  const baseRent = rental.monthlyRent || rental.value || 0;
  const garage = rental.hasGarage && rental.garageValue ? rental.garageValue : 0;

  // ✅ PERFORMANCE: Preparar todos os updates em array para batch
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

  // ✅ PERFORMANCE: Updates paralelos para maior velocidade
  await Promise.all(
    updates.map(async (update) => {
      const { error } = await supabase
        .from("payments")
        .update({
          expected_amount: update.expected_amount,
          breakdown: update.breakdown,
        })
        .eq("id", update.id);
      
      if (error) {
        console.error(`❌ Erro ao atualizar pagamento ${update.id}:`, error);
        throw error;
      }
    })
  );

  console.log(`✅ ${futurePayments.length} pagamentos futuros atualizados`);
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

export const migrateProportionalFirstPayments = async () => {
  console.log("Migration requested");
  return { success: true, count: 0 };
};