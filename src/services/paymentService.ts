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
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    monthlyRent,
    paymentDay,
    hasGarage,
    garageValue,
  });

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

  const paymentsToCreate: any[] = [];
  
  const startDay = startDate.getDate();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  
  const endDay = endDate.getDate();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();
  
  let currentMonth = startMonth;
  let currentYear = startYear;
  
  let installmentNumber = 0;
  let isFirstPayment = true;
  let hasProrata = false;
  
  console.log("📅 Período do contrato:", {
    inicio: `${startDay}/${startMonth + 1}/${startYear}`,
    fim: `${endDay}/${endMonth + 1}/${endYear}`,
  });
  
  while (
    currentYear < endYear || 
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const refMonth = currentMonth + 1;
    const refYear = currentYear;
    const refKey = `${refYear}-${refMonth}`;

    if (existingRefs.has(refKey)) {
      console.log(`⏭️  Pulando ${refMonth}/${refYear} - já existe`);
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      continue;
    }

    const daysInMonth = new Date(refYear, refMonth, 0).getDate();
    let dueDate: Date;
    let expectedAmount: number;
    const breakdown: Array<{ description: string; amount: number; type: string }> = [];

    const isFirstMonthOfContract = (currentYear === startYear && currentMonth === startMonth);
    const isLastMonthOfContract = (currentYear === endYear && currentMonth === endMonth);

    if (isFirstMonthOfContract && startDay > 1) {
      let dueDateDay: number;
      let daysToCharge: number;
      
      if (startDay <= paymentDay) {
        dueDateDay = Math.min(paymentDay, daysInMonth);
        daysToCharge = dueDateDay - startDay + 1;
      } else {
        const nextMonth = currentMonth + 1;
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const nextMonthIndex = nextMonth > 11 ? 0 : nextMonth;
        const daysInNextMonth = new Date(nextYear, nextMonthIndex + 1, 0).getDate();
        dueDateDay = Math.min(paymentDay, daysInNextMonth);
        daysToCharge = dueDateDay;
      }
      
      dueDate = startDay <= paymentDay 
        ? new Date(refYear, currentMonth, dueDateDay)
        : new Date(refYear, currentMonth + 1, dueDateDay);

      const proportionalRent = (rentValue / 30) * daysToCharge;
      const proportionalGarage = hasGarage && garage ? (garage / 30) * daysToCharge : 0;
      expectedAmount = proportionalRent + proportionalGarage;

      const isProrata = daysToCharge < 15;
      
      if (isProrata) {
        hasProrata = true;
        breakdown.push({
          description: `Prorata (${daysToCharge} dias - ${startDate.toISOString().split("T")[0]} até ${dueDate.toISOString().split("T")[0]})`,
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
        
        paymentsToCreate.push({
          rental_id: rental.id,
          reference_month: refMonth,
          reference_year: refYear,
          due_date: dueDate.toISOString().split("T")[0],
          expected_amount: parseFloat(expectedAmount.toFixed(2)),
          status: "pending",
          breakdown: breakdown,
          installment: 0,
          total_installments: null,
        });
        
        console.log(`📝 Criando PRORATA - ${refMonth}/${refYear}: ${daysToCharge} dias = R$ ${expectedAmount.toFixed(2)}`);
        
      } else {
        installmentNumber = 1;
        
        breakdown.push({
          description: `Aluguel Proporcional - 1ª Parcela (${daysToCharge} dias - ${startDate.toISOString().split("T")[0]} até ${dueDate.toISOString().split("T")[0]})`,
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
        
        paymentsToCreate.push({
          rental_id: rental.id,
          reference_month: refMonth,
          reference_year: refYear,
          due_date: dueDate.toISOString().split("T")[0],
          expected_amount: parseFloat(expectedAmount.toFixed(2)),
          status: "pending",
          breakdown: breakdown,
          installment: installmentNumber,
          total_installments: null,
        });
        
        console.log(`📝 Criando PARCELA ${installmentNumber}/XX - ${refMonth}/${refYear}: ${daysToCharge} dias = R$ ${expectedAmount.toFixed(2)}`);
      }
      
      isFirstPayment = false;
      
    } else if (isLastMonthOfContract && endDay < daysInMonth) {
      const dueDateDay = Math.min(paymentDay, daysInMonth);
      dueDate = new Date(refYear, currentMonth, dueDateDay);
      
      const daysToCharge = endDay;
      const proportionalRent = (rentValue / 30) * daysToCharge;
      const proportionalGarage = hasGarage && garage ? (garage / 30) * daysToCharge : 0;
      expectedAmount = proportionalRent + proportionalGarage;

      if (installmentNumber === 0) {
        installmentNumber = 1;
      } else {
        installmentNumber++;
      }
      
      breakdown.push({
        description: `Aluguel Proporcional - Última Parcela (${daysToCharge} dias - até ${endDate.toISOString().split("T")[0]})`,
        amount: parseFloat(proportionalRent.toFixed(2)),
        type: "addition",
      });

      if (hasGarage && proportionalGarage > 0) {
        breakdown.push({
          description: `Garagem Proporcional - Última Parcela (${daysToCharge} dias)`,
          amount: parseFloat(proportionalGarage.toFixed(2)),
          type: "addition",
        });
      }
      
      paymentsToCreate.push({
        rental_id: rental.id,
        reference_month: refMonth,
        reference_year: refYear,
        due_date: dueDate.toISOString().split("T")[0],
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
        total_installments: null,
      });
      
      console.log(`📝 Criando ÚLTIMA PARCELA ${installmentNumber}/XX - ${refMonth}/${refYear}: ${daysToCharge} dias = R$ ${expectedAmount.toFixed(2)}`);
      
    } else {
      const dueDateDay = Math.min(paymentDay, daysInMonth);
      dueDate = new Date(refYear, currentMonth, dueDateDay);
      expectedAmount = totalMonthlyValue;

      if (isFirstPayment) {
        installmentNumber = 1;
        isFirstPayment = false;
      } else if (installmentNumber > 0) {
        installmentNumber++;
      }
      
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
        reference_month: refMonth,
        reference_year: refYear,
        due_date: dueDate.toISOString().split("T")[0],
        expected_amount: parseFloat(expectedAmount.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber > 0 ? installmentNumber : 0,
        total_installments: null,
      });
      
      console.log(`📝 Criando PARCELA ${installmentNumber > 0 ? installmentNumber : 'PRORATA'}/XX - ${refMonth}/${refYear}: R$ ${expectedAmount.toFixed(2)}`);
    }

    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  const totalInstallments = paymentsToCreate.filter(p => p.installment > 0).length;
  
  console.log("📊 Resumo dos Pagamentos:", {
    totalPayments: paymentsToCreate.length,
    hasProrata: hasProrata,
    totalInstallments: totalInstallments,
    firstInstallment: paymentsToCreate[0]?.installment,
    lastInstallment: paymentsToCreate[paymentsToCreate.length - 1]?.installment,
  });
  
  paymentsToCreate.forEach(payment => {
    payment.total_installments = totalInstallments;
  });

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

export async function fixAllRentalsPayments(): Promise<{
  success: boolean;
  totalRentals: number;
  fixed: number;
  errors: string[];
}> {
  console.log("🔧 INICIANDO CORREÇÃO EM MASSA DE RECEBIMENTOS");
  console.log("=" .repeat(80));
  
  const errors: string[] = [];
  let fixed = 0;

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

    if (rentalsError) {
      console.error("❌ Erro ao buscar locações:", rentalsError);
      throw rentalsError;
    }

    if (!rentals || rentals.length === 0) {
      console.log("ℹ️  Nenhuma locação encontrada");
      return { success: true, totalRentals: 0, fixed: 0, errors: [] };
    }

    console.log(`📋 Encontradas ${rentals.length} locações para verificar\n`);

    for (let i = 0; i < rentals.length; i++) {
      const rental = rentals[i];
      const propertyName = rental.properties?.property_identifier || "Sem identificação";
      
      console.log(`\n${"=".repeat(80)}`);
      console.log(`🏠 [${i + 1}/${rentals.length}] Processando: ${propertyName}`);
      console.log(`📅 Período: ${rental.start_date} até ${rental.end_date}`);
      console.log(`💰 Valor: R$ ${rental.rent_value}`);
      console.log(`📆 Vencimento: Dia ${rental.rent_due_day}`);

      try {
        console.log("\n🗑️  DELETANDO todos os recebimentos existentes...");
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("rental_id", rental.id);

        if (deleteError) {
          console.error(`❌ Erro ao deletar recebimentos:`, deleteError);
          errors.push(`${propertyName}: Erro ao deletar - ${deleteError.message}`);
          continue;
        }

        console.log("✅ Recebimentos deletados com sucesso");

        console.log("\n🔨 RECRIANDO recebimentos com regras corretas...");
        await createPaymentsForRental({
          rental: rental as any,
          startDate: new Date(rental.start_date + "T00:00:00"),
          endDate: new Date(rental.end_date + "T00:00:00"),
          monthlyRent: rental.rent_value || 0,
          paymentDay: rental.rent_due_day || 5,
          hasGarage: rental.has_garage || false,
          garageValue: rental.garage_value || 0,
        });

        console.log("✅ Recebimentos recriados com sucesso");
        fixed++;

      } catch (error: any) {
        console.error(`❌ Erro ao processar locação ${propertyName}:`, error);
        errors.push(`${propertyName}: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 RESUMO DA CORREÇÃO:");
    console.log(`✅ Total de locações processadas: ${rentals.length}`);
    console.log(`✅ Locações corrigidas: ${fixed}`);
    console.log(`❌ Erros: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log("\n❌ ERROS ENCONTRADOS:");
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`);
      });
    }
    
    console.log("=".repeat(80));

    return {
      success: errors.length === 0,
      totalRentals: rentals.length,
      fixed,
      errors,
    };

  } catch (error: any) {
    console.error("❌ Erro fatal na correção em massa:", error);
    return {
      success: false,
      totalRentals: 0,
      fixed: 0,
      errors: [error.message],
    };
  }
}