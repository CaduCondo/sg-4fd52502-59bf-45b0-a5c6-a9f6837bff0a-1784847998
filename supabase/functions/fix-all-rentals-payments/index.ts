import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payment {
  id: string;
  rental_id: string;
  due_date: string;
  amount: number;
  status: string;
  installment_number: number | null;
  total_installments: number | null;
  is_proportional: boolean;
  attachments: any[];
}

interface Rental {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rental_amount: number;
  due_day: number;
  status: string;
  igpm_adjustment: boolean;
  igpm_adjustment_month: number | null;
  payments: Payment[];
}

interface FixResult {
  rental_id: string;
  property_address: string;
  tenant_name: string;
  issues_found: string[];
  corrections_applied: string[];
  payments_created: number;
  payments_updated: number;
  payments_deleted: number;
  status: "success" | "error";
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todas as locações ativas com seus recebimentos
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select(`
        id,
        property_id,
        tenant_id,
        start_date,
        end_date,
        rental_amount,
        due_day,
        status,
        igpm_adjustment,
        igpm_adjustment_month,
        properties!inner(address, city, state),
        tenants!inner(name),
        payments(
          id,
          due_date,
          amount,
          status,
          installment_number,
          total_installments,
          is_proportional,
          attachments
        )
      `)
      .eq("status", "active")
      .order("start_date", { ascending: true });

    if (rentalsError) throw rentalsError;

    const results: FixResult[] = [];

    // Buscar dados do IGPM para reajustes
    const { data: igpmData } = await supabase
      .from("igpm_rates")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    const igpmMap = new Map<string, number>();
    if (igpmData) {
      igpmData.forEach((rate: any) => {
        igpmMap.set(`${rate.year}-${rate.month}`, rate.rate);
      });
    }

    // Processar cada locação
    for (const rental of (rentals as any[])) {
      const result = await fixRentalPayments(supabase, rental, igpmMap);
      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_rentals: results.length,
        successful_fixes: results.filter(r => r.status === "success").length,
        failed_fixes: results.filter(r => r.status === "error").length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fixRentalPayments(
  supabase: any,
  rental: any,
  igpmMap: Map<string, number>
): Promise<FixResult> {
  const result: FixResult = {
    rental_id: rental.id,
    property_address: `${rental.properties.address}, ${rental.properties.city}/${rental.properties.state}`,
    tenant_name: rental.tenants.name,
    issues_found: [],
    corrections_applied: [],
    payments_created: 0,
    payments_updated: 0,
    payments_deleted: 0,
    status: "success",
  };

  try {
    const startDate = new Date(rental.start_date);
    const endDate = new Date(rental.end_date);
    const dueDay = rental.due_day;
    const baseAmount = rental.rental_amount;

    // Calcular parcelas esperadas
    const expectedPayments = calculateExpectedPayments(
      startDate,
      endDate,
      dueDay,
      baseAmount,
      rental.igpm_adjustment,
      rental.igpm_adjustment_month,
      igpmMap
    );

    // Separar pagamentos existentes entre pagos e pendentes
    const paidPayments = rental.payments.filter((p: Payment) => p.status === "paid");
    const pendingPayments = rental.payments.filter((p: Payment) => p.status !== "paid");

    // Verificar problemas
    if (rental.payments.length < expectedPayments.length) {
      result.issues_found.push(`Faltam ${expectedPayments.length - rental.payments.length} recebimentos`);
    }
    if (rental.payments.length > expectedPayments.length) {
      result.issues_found.push(`Existem ${rental.payments.length - expectedPayments.length} recebimentos a mais`);
    }

    // Verificar duplicatas
    const dueDateCounts = new Map<string, number>();
    rental.payments.forEach((p: Payment) => {
      const dateKey = p.due_date.substring(0, 10);
      dueDateCounts.set(dateKey, (dueDateCounts.get(dateKey) || 0) + 1);
    });
    const duplicates = Array.from(dueDateCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      result.issues_found.push(`${duplicates.length} datas de vencimento duplicadas`);
    }

    // Criar mapa de pagamentos existentes por data
    const existingPaymentsMap = new Map<string, Payment>();
    rental.payments.forEach((p: Payment) => {
      const dateKey = p.due_date.substring(0, 10);
      existingPaymentsMap.set(dateKey, p);
    });

    // Processar correções
    for (const expected of expectedPayments) {
      const dateKey = expected.due_date.substring(0, 10);
      const existing = existingPaymentsMap.get(dateKey);

      if (!existing) {
        // Criar novo recebimento
        const { error } = await supabase.from("payments").insert({
          rental_id: rental.id,
          due_date: expected.due_date,
          amount: expected.amount,
          status: "pending",
          installment_number: expected.installment_number,
          total_installments: expected.total_installments,
          is_proportional: expected.is_proportional,
        });

        if (error) throw error;

        result.payments_created++;
        result.corrections_applied.push(
          `Criado: ${expected.is_proportional ? "Proporcional" : `${expected.installment_number}/${expected.total_installments}`} - ${dateKey} - R$ ${expected.amount.toFixed(2)}`
        );
      } else if (existing.status !== "paid") {
        // Atualizar recebimento pendente se necessário
        const updates: any = {};
        let needsUpdate = false;

        if (existing.installment_number !== expected.installment_number) {
          updates.installment_number = expected.installment_number;
          needsUpdate = true;
        }
        if (existing.total_installments !== expected.total_installments) {
          updates.total_installments = expected.total_installments;
          needsUpdate = true;
        }
        if (existing.is_proportional !== expected.is_proportional) {
          updates.is_proportional = expected.is_proportional;
          needsUpdate = true;
        }
        if (Math.abs(existing.amount - expected.amount) > 0.01) {
          updates.amount = expected.amount;
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { error } = await supabase
            .from("payments")
            .update(updates)
            .eq("id", existing.id);

          if (error) throw error;

          result.payments_updated++;
          result.corrections_applied.push(
            `Atualizado: ${expected.is_proportional ? "Proporcional" : `${expected.installment_number}/${expected.total_installments}`} - ${dateKey}`
          );
        }
      } else {
        // Pagamento pago - apenas atualizar numeração se necessário
        const updates: any = {};
        let needsUpdate = false;

        if (existing.installment_number !== expected.installment_number) {
          updates.installment_number = expected.installment_number;
          needsUpdate = true;
        }
        if (existing.total_installments !== expected.total_installments) {
          updates.total_installments = expected.total_installments;
          needsUpdate = true;
        }
        if (existing.is_proportional !== expected.is_proportional) {
          updates.is_proportional = expected.is_proportional;
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { error } = await supabase
            .from("payments")
            .update(updates)
            .eq("id", existing.id);

          if (error) throw error;

          result.payments_updated++;
          result.corrections_applied.push(
            `Atualizado numeração (pago): ${expected.is_proportional ? "Proporcional" : `${expected.installment_number}/${expected.total_installments}`} - ${dateKey}`
          );
        }
      }
    }

    // Deletar recebimentos extras (apenas os pendentes e fora do período)
    const expectedDates = new Set(expectedPayments.map(p => p.due_date.substring(0, 10)));
    const paymentsToDelete = rental.payments.filter((p: Payment) => {
      const dateKey = p.due_date.substring(0, 10);
      return p.status !== "paid" && !expectedDates.has(dateKey);
    });

    for (const payment of paymentsToDelete) {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", payment.id);

      if (error) throw error;

      result.payments_deleted++;
      result.corrections_applied.push(`Deletado: ${payment.due_date.substring(0, 10)} (fora do período)`);
    }

    if (result.issues_found.length === 0) {
      result.issues_found.push("Nenhum problema encontrado");
    }
    if (result.corrections_applied.length === 0) {
      result.corrections_applied.push("Nenhuma correção necessária");
    }

  } catch (error) {
    result.status = "error";
    result.error = error.message;
  }

  return result;
}

function calculateExpectedPayments(
  startDate: Date,
  endDate: Date,
  dueDay: number,
  baseAmount: number,
  igpmAdjustment: boolean,
  igpmAdjustmentMonth: number | null,
  igpmMap: Map<string, number>
): Array<{
  due_date: string;
  amount: number;
  installment_number: number | null;
  total_installments: number;
  is_proportional: boolean;
}> {
  const payments: Array<any> = [];
  
  // Calcular total de meses
  const totalMonths = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  // Primeira parcela
  const firstDueDate = new Date(startDate);
  firstDueDate.setDate(dueDay);
  
  // Ajustar para o próximo mês se necessário
  if (firstDueDate <= startDate) {
    firstDueDate.setMonth(firstDueDate.getMonth() + 1);
  }

  // Calcular dias do proporcional inicial
  const daysInFirstMonth = Math.ceil(
    (firstDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const firstIsProportional = daysInFirstMonth < 30;
  const firstCountsAsInstallment = daysInFirstMonth >= 15;

  let currentInstallment = 0;
  let currentAmount = baseAmount;

  // Adicionar primeira parcela
  if (firstIsProportional) {
    const proportionalAmount = (baseAmount / 30) * daysInFirstMonth;
    payments.push({
      due_date: firstDueDate.toISOString().split("T")[0],
      amount: proportionalAmount,
      installment_number: firstCountsAsInstallment ? 1 : null,
      total_installments: totalMonths,
      is_proportional: true,
    });
    
    if (firstCountsAsInstallment) {
      currentInstallment = 1;
    }
  } else {
    payments.push({
      due_date: firstDueDate.toISOString().split("T")[0],
      amount: baseAmount,
      installment_number: 1,
      total_installments: totalMonths,
      is_proportional: false,
    });
    currentInstallment = 1;
  }

  // Parcelas intermediárias
  const currentDate = new Date(firstDueDate);
  currentDate.setMonth(currentDate.getMonth() + 1);

  while (currentDate <= endDate) {
    // Verificar se precisa aplicar reajuste IGPM
    if (igpmAdjustment && igpmAdjustmentMonth) {
      const monthsSinceStart = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      
      if (monthsSinceStart > 0 && monthsSinceStart % igpmAdjustmentMonth === 0) {
        // Aplicar reajuste acumulado
        const adjustmentPeriods = Math.floor(monthsSinceStart / igpmAdjustmentMonth);
        let accumulatedRate = 1;
        
        for (let i = 0; i < adjustmentPeriods; i++) {
          const adjustmentDate = new Date(startDate);
          adjustmentDate.setMonth(adjustmentDate.getMonth() + (i * igpmAdjustmentMonth));
          const year = adjustmentDate.getFullYear();
          const month = adjustmentDate.getMonth() + 1;
          const rate = igpmMap.get(`${year}-${month}`) || 0;
          accumulatedRate *= (1 + rate / 100);
        }
        
        currentAmount = baseAmount * accumulatedRate;
      }
    }

    // Verificar se é a última parcela e se é proporcional
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    if (nextMonth > endDate) {
      // Última parcela proporcional
      const daysInLastMonth = Math.ceil(
        (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const proportionalAmount = (currentAmount / 30) * daysInLastMonth;
      
      payments.push({
        due_date: currentDate.toISOString().split("T")[0],
        amount: proportionalAmount,
        installment_number: currentInstallment + 1,
        total_installments: totalMonths,
        is_proportional: true,
      });
      break;
    }

    currentInstallment++;
    payments.push({
      due_date: currentDate.toISOString().split("T")[0],
      amount: currentAmount,
      installment_number: currentInstallment,
      total_installments: totalMonths,
      is_proportional: false,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return payments;
}