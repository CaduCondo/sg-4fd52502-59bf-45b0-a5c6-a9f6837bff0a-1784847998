import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: rentals, error: rErr } = await supabaseClient
      .from("rentals")
      .select("*")
      .neq("status", "terminated")

    if (rErr) throw rErr;

    const { data: allPayments, error: pErr } = await supabaseClient
      .from("payments")
      .select("*")

    if (pErr) throw pErr;

    let fixedRentals = 0;
    let logOutput = [];

    for (const rental of rentals) {
      let payments = allPayments.filter(p => p.rental_id === rental.id);
      if (payments.length === 0) continue;

      payments = payments.map(p => ({
          ...p,
          ref_date: new Date(Number(p.reference_year), Number(p.reference_month) - 1, 1)
      }));

      let minDate = new Date(3000, 0, 1);
      let maxDate = new Date(1970, 0, 1);
      for(const p of payments) {
         if (p.ref_date < minDate) minDate = p.ref_date;
         if (p.ref_date > maxDate) maxDate = p.ref_date;
      }

      let currentD = new Date(minDate);
      while (currentD <= maxDate) {
        const m = currentD.getMonth() + 1;
        const y = currentD.getFullYear();
        if (!payments.find(p => Number(p.reference_month) === m && Number(p.reference_year) === y)) {
           payments.push({
              isNew: true,
              rental_id: rental.id,
              reference_month: m.toString(),
              reference_year: y.toString(),
              expected_amount: rental.rent_value,
              is_paid: false,
              notes: null,
              ref_date: new Date(y, m - 1, 1)
           });
        }
        currentD.setMonth(currentD.getMonth() + 1);
      }

      payments.sort((a, b) => a.ref_date.getTime() - b.ref_date.getTime());

      let currentInstallment = 1;
      let needsUpdate = false;
      let rentalLog = `
🏠 Analisando Locação: ${rental.property_identifier || rental.id}
`;

      const [sYear, sMonth, sDay] = rental.start_date.split('-').map(Number);
      const daysInMonth = new Date(sYear, sMonth, 0).getDate();
      const daysLived = daysInMonth - sDay + 1;
      const isFirstProrata = daysLived < 15;

      for (let i = 0; i < payments.length; i++) {
         let p = payments[i];
         let isFirst = (i === 0);
         
         p.origInstallment = p.installment;
         p.origNotes = p.notes;

         let cleanNotes = (p.notes || "").replace(/Parcela Proporcional/gi, "").replace(/^[- \s]+|[- \s]+$/g, "");
         if (cleanNotes === "") cleanNotes = null;

         if (isFirst && isFirstProrata) {
            p.installment = null;
            p.notes = cleanNotes ? cleanNotes + " - Parcela Proporcional" : "Parcela Proporcional";
         } else {
            p.installment = currentInstallment++;
            p.notes = cleanNotes;
         }

         if (p.installment !== p.origInstallment || p.notes !== p.origNotes || p.isNew) {
             needsUpdate = true;
         }
      }

      if (needsUpdate) {
          fixedRentals++;
          const total_installments = currentInstallment - 1;

          for (const p of payments) {
              if (p.isNew) {
                  rentalLog += `  ➕ Criando mês faltante: ${p.reference_month}/${p.reference_year}
`;
                  await supabaseClient.from('payments').insert({
                      rental_id: p.rental_id,
                      reference_month: p.reference_month,
                      reference_year: p.reference_year,
                      expected_amount: p.expected_amount,
                      installment: p.installment,
                      total_installments: total_installments,
                      is_paid: false,
                      notes: p.notes
                  });
              } else if (p.installment !== p.origInstallment || p.notes !== p.origNotes) {
                  rentalLog += `  ✏️  Atualizando parcela ${p.reference_month}/${p.reference_year} -> Num: ${p.installment || 'Prorata'}, Notas: ${p.notes || 'Corrigido'}
`;
                  await supabaseClient.from('payments').update({
                      installment: p.installment,
                      total_installments: total_installments,
                      notes: p.notes
                  }).eq('id', p.id);
              } else {
                  await supabaseClient.from('payments').update({
                      total_installments: total_installments,
                  }).eq('id', p.id);
              }
          }
          logOutput.push(rentalLog);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `✅ Correção concluída! Locações corrigidas: ${fixedRentals}`,
      details: logOutput.join("")
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})