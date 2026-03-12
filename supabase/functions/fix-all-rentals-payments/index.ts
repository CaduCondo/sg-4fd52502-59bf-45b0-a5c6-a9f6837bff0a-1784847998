import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

function formatDateLocal(dateString: string): Date {
  if (!dateString) return new Date();
  return new Date(dateString + "T00:00:00");
}

function calculateDaysBetweenDates(startDate: string, paymentDay: number): number {
  const start = formatDateLocal(startDate);
  const startDay = start.getDate();
  if (startDay === paymentDay) return 30;

  const paymentDate = new Date(start);
  if (startDay > paymentDay) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  }
  paymentDate.setDate(paymentDay);

  const diffTime = paymentDate.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Bypasses RLS perfectly
    )

    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      console.log(msg);
    };

    log("🔍 Iniciando correção inteligente de recebimentos...");

    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select(`
        id, start_date, end_date, rent_value, rent_due_day, has_garage, garage_value,
        properties ( property_identifier )
      `)
      .neq("status", "terminated");

    if (rentalsError) throw rentalsError;

    log(`Encontradas ${rentals?.length || 0} locações ativas.`);

    let fixedCount = 0;

    for (const rental of (rentals || [])) {
      const propName = rental.properties?.property_identifier || rental.id;
      log(`
🏠 Processando: ${propName}`);

      const { data: currentPayments } = await supabase
        .from("payments")
        .select("id, reference_month, reference_year, is_paid, expected_amount, installment, total_installments, notes")
        .eq("rental_id", rental.id)
        .order("reference_year", { ascending: true })
        .order("reference_month", { ascending: true });

      const totalRentValue = Number(rental.rent_value || 0) + (rental.has_garage ? Number(rental.garage_value || 0) : 0);

      const startDate = formatDateLocal(rental.start_date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;

      let endDate = rental.end_date ? formatDateLocal(rental.end_date) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;

      let currentYear = startYear;
      let currentMonth = startMonth;

      const firstMonthDays = calculateDaysBetweenDates(rental.start_date, rental.rent_due_day);
      let installmentCounter = 1;

      const expectedPayments = [];

      while (
        currentYear < endYear ||
        (currentYear === endYear && currentMonth <= endMonth)
      ) {
        const isFirstMonthOfContract = currentYear === startYear && currentMonth === startMonth;
        const isLastMonthOfContract = currentYear === endYear && currentMonth === endMonth;

        let expectedAmount = totalRentValue;
        let currentInstallment = 0;
        let isProportional = false;

        if (isFirstMonthOfContract) {
          if (firstMonthDays === 30) {
            expectedAmount = totalRentValue;
            currentInstallment = installmentCounter++;
          } else {
            isProportional = true;
            expectedAmount = Math.round((totalRentValue / 30) * firstMonthDays * 100) / 100;
            if (firstMonthDays < 15) {
              currentInstallment = 0; // Prorata (não conta parcela)
            } else {
              currentInstallment = installmentCounter++; // Conta como primeira
            }
          }
        } else if (isLastMonthOfContract) {
          const lastDay = endDate.getDate();
          if (lastDay !== rental.rent_due_day) {
            isProportional = true;
            let lastMonthDays = lastDay;
            if (rental.rent_due_day < lastDay) {
              lastMonthDays = lastDay - rental.rent_due_day;
            }
            if (lastMonthDays < 30) {
               expectedAmount = Math.round((totalRentValue / 30) * lastMonthDays * 100) / 100;
            }
          }
          currentInstallment = installmentCounter++;
        } else {
          currentInstallment = installmentCounter++;
        }

        expectedPayments.push({
          month: currentMonth.toString().padStart(2, '0'),
          year: currentYear.toString(),
          amount: expectedAmount,
          installment: currentInstallment,
          isProportional
        });

        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      const maxInstallment = installmentCounter - 1;

      let locationFixed = false;

      // CRUZAMENTO DE DADOS (CRIA O QUE FALTA E ARRUMA TEXTOS DE O QUE EXISTE)
      for (const ideal of expectedPayments) {
        const existing = currentPayments?.find(p => p.reference_month === ideal.month && p.reference_year === ideal.year);

        if (!existing) {
          log(`  ➕ Faltando mês ${ideal.month}/${ideal.year}. Inserindo...`);

          let dueDateObj = new Date(Number(ideal.year), Number(ideal.month) - 1, rental.rent_due_day);
          let actualDueDateStr = `${dueDateObj.getFullYear()}-${(dueDateObj.getMonth()+1).toString().padStart(2, '0')}-${dueDateObj.getDate().toString().padStart(2, '0')}`;

          await supabase.from("payments").insert({
            rental_id: rental.id,
            reference_month: ideal.month,
            reference_year: ideal.year,
            expected_amount: ideal.amount,
            due_date: actualDueDateStr,
            status: "pending",
            is_paid: false,
            installment: ideal.installment > 0 ? ideal.installment : null,
            total_installments: maxInstallment,
            notes: ideal.isProportional ? "Parcela Proporcional" : ""
          });
          locationFixed = true;
        } else {
          let needsUpdate = false;
          let updateData: any = {};

          const idealInstallmentToSave = ideal.installment > 0 ? ideal.installment : null;

          if (existing.installment !== idealInstallmentToSave) {
             needsUpdate = true;
             updateData.installment = idealInstallmentToSave;
          }

          if (existing.total_installments !== maxInstallment) {
             needsUpdate = true;
             updateData.total_installments = maxInstallment;
          }

          const idealNote = ideal.isProportional ? "Parcela Proporcional" : "";
          
          // Tratando a correção da nota de "Parcela Proporcional" 
          if (existing.notes === "Parcela Proporcional" && !ideal.isProportional) {
              needsUpdate = true;
              updateData.notes = ""; // Limpa a nota de março, por exemplo
          } else if (existing.notes !== "Parcela Proporcional" && ideal.isProportional) {
              needsUpdate = true;
              updateData.notes = "Parcela Proporcional"; // Adiciona se precisar
          }

          // Se tiver valor errado E não estiver pago, arruma
          if (!existing.is_paid && Math.abs(Number(existing.expected_amount) - ideal.amount) > 0.01) {
              needsUpdate = true;
              updateData.expected_amount = ideal.amount;
          }

          if (needsUpdate) {
             log(`  🔄 Atualizando: ${ideal.month}/${ideal.year} -> Parcela ${idealInstallmentToSave || 'Prorata'}, Nota: ${updateData.notes !== undefined ? updateData.notes : existing.notes}`);
             await supabase.from("payments").update(updateData).eq("id", existing.id);
             locationFixed = true;
          }
        }
      }

      if (locationFixed) {
        fixedCount++;
      }
    }

    log(`
✅ Correção finalizada com sucesso! ${fixedCount} locações ajustadas.`);
    
    return new Response(JSON.stringify({ success: true, fixedCount, logs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
})