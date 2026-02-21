import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Rental {
  id: string;
  property_id: string;
  tenant_id: string;
  rental_value: number;
  garage_value: number;
  start_date: string;
  end_date: string;
  payment_day: number;
  first_payment_month: string;
  status: string;
}

function calculateProportionalDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function calculateProportionalValue(monthlyValue: number, days: number): number {
  return Math.round((monthlyValue / 30) * days * 100) / 100;
}

function generatePaymentsForRental(rental: Rental): any[] {
  const payments: any[] = [];
  const startDate = new Date(rental.start_date + "T00:00:00");
  const endDate = new Date(rental.end_date + "T00:00:00");
  const paymentDay = rental.payment_day;
  const monthlyValue = rental.rental_value + (rental.garage_value || 0);

  console.log(`\n📅 Processando locação ${rental.id}:`);
  console.log(`   Início: ${rental.start_date}, Fim: ${rental.end_date}`);
  console.log(`   Dia pagamento: ${paymentDay}, Valor mensal: R$ ${monthlyValue.toFixed(2)}`);

  // Parse first_payment_month (formato: "2026-02")
  const [firstYear, firstMonth] = rental.first_payment_month.split("-").map(Number);

  // Calcular primeira data de vencimento
  let firstDueDate = new Date(firstYear, firstMonth - 1, paymentDay);
  
  // Se o dia de pagamento for maior que os dias do mês, ajustar para último dia
  const lastDayOfFirstMonth = new Date(firstYear, firstMonth, 0).getDate();
  if (paymentDay > lastDayOfFirstMonth) {
    firstDueDate.setDate(lastDayOfFirstMonth);
  }

  console.log(`   Primeiro vencimento: ${firstDueDate.toISOString().split('T')[0]}`);

  // Primeiro recebimento (proporcional)
  const firstPaymentDays = calculateProportionalDays(startDate, firstDueDate);
  const firstPaymentValue = calculateProportionalValue(monthlyValue, firstPaymentDays);

  const firstBreakdown = rental.garage_value > 0 ? [
    {
      type: "charge",
      description: "Aluguel (proporcional)",
      amount: calculateProportionalValue(rental.rental_value, firstPaymentDays)
    },
    {
      type: "charge",
      description: "Vaga (proporcional)",
      amount: calculateProportionalValue(rental.garage_value, firstPaymentDays)
    }
  ] : [
    {
      type: "charge",
      description: "Aluguel (proporcional)",
      amount: firstPaymentValue
    }
  ];

  payments.push({
    rental_id: rental.id,
    property_id: rental.property_id,
    tenant_id: rental.tenant_id,
    due_date: firstDueDate.toISOString().split("T")[0],
    amount: firstPaymentValue,
    status: "pending",
    payment_type: "rental",
    rental_breakdown: firstBreakdown
  });

  console.log(`   ✅ Primeiro pagamento: ${firstDueDate.toISOString().split('T')[0]} - R$ ${firstPaymentValue.toFixed(2)} (${firstPaymentDays} dias proporcionais)`);

  // Gerar recebimentos mensais intermediários
  let currentDueDate = new Date(firstDueDate);
  let monthCount = 0;

  while (true) {
    // Avançar para o próximo mês
    currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    monthCount++;

    // Ajustar o dia se necessário (ex: 31 em fevereiro)
    const year = currentDueDate.getFullYear();
    const month = currentDueDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    if (paymentDay > lastDayOfMonth) {
      currentDueDate.setDate(lastDayOfMonth);
    } else {
      currentDueDate.setDate(paymentDay);
    }

    const dueDateStr = currentDueDate.toISOString().split("T")[0];

    // Se a data de vencimento ultrapassou a data fim, parar
    if (currentDueDate >= endDate) {
      console.log(`   ⏹️ Parou em ${dueDateStr} (>= data fim ${endDate.toISOString().split('T')[0]})`);
      break;
    }

    // Criar recebimento intermediário (100% do valor)
    const intermediateBreakdown = rental.garage_value > 0 ? [
      {
        type: "charge",
        description: "Aluguel",
        amount: rental.rental_value
      },
      {
        type: "charge",
        description: "Vaga",
        amount: rental.garage_value
      }
    ] : [
      {
        type: "charge",
        description: "Aluguel",
        amount: monthlyValue
      }
    ];

    payments.push({
      rental_id: rental.id,
      property_id: rental.property_id,
      tenant_id: rental.tenant_id,
      due_date: dueDateStr,
      amount: monthlyValue,
      status: "pending",
      payment_type: "rental",
      rental_breakdown: intermediateBreakdown
    });

    console.log(`   ✅ Recebimento #${monthCount}: ${dueDateStr} - R$ ${monthlyValue.toFixed(2)} (100%)`);
  }

  // Último recebimento proporcional (se necessário)
  if (payments.length > 0) {
    const lastPaymentDate = new Date(payments[payments.length - 1].due_date + "T00:00:00");
    
    // Calcular dias do último recebimento até o fim do contrato
    const lastPaymentDays = calculateProportionalDays(lastPaymentDate, endDate);
    
    console.log(`   🔍 Último recebimento: ${lastPaymentDate.toISOString().split('T')[0]}`);
    console.log(`   🔍 Data fim: ${endDate.toISOString().split('T')[0]}`);
    console.log(`   🔍 Dias restantes: ${lastPaymentDays}`);

    // Se há dias restantes entre o último recebimento e o fim do contrato, criar proporcional
    if (lastPaymentDays > 1 && lastPaymentDays < 30) {
      const lastPaymentValue = calculateProportionalValue(monthlyValue, lastPaymentDays);

      const lastBreakdown = rental.garage_value > 0 ? [
        {
          type: "charge",
          description: "Aluguel (proporcional)",
          amount: calculateProportionalValue(rental.rental_value, lastPaymentDays)
        },
        {
          type: "charge",
          description: "Vaga (proporcional)",
          amount: calculateProportionalValue(rental.garage_value, lastPaymentDays)
        }
      ] : [
        {
          type: "charge",
          description: "Aluguel (proporcional)",
          amount: lastPaymentValue
        }
      ];

      payments.push({
        rental_id: rental.id,
        property_id: rental.property_id,
        tenant_id: rental.tenant_id,
        due_date: endDate.toISOString().split("T")[0],
        amount: lastPaymentValue,
        status: "pending",
        payment_type: "rental",
        rental_breakdown: lastBreakdown
      });

      console.log(`   ✅ Último pagamento proporcional: ${endDate.toISOString().split('T')[0]} - R$ ${lastPaymentValue.toFixed(2)} (${lastPaymentDays} dias)`);
    }
  }

  console.log(`   📊 Total de pagamentos gerados: ${payments.length}\n`);
  return payments;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔧 Iniciando correção de todas as locações...\n");

    // 1. Buscar todas as locações ativas
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (rentalsError) {
      throw new Error(`Erro ao buscar locações: ${rentalsError.message}`);
    }

    if (!rentals || rentals.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhuma locação ativa encontrada",
          rentalsProcessed: 0,
          paymentsCreated: 0,
          duplicatesRemoved: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Encontradas ${rentals.length} locações ativas\n`);

    let totalCreated = 0;
    let totalDuplicatesRemoved = 0;
    const results = [];

    // 2. Processar cada locação
    for (const rental of rentals) {
      try {
        console.log(`🏠 Processando locação ${rental.id}...`);

        // Gerar TODOS os novos recebimentos (sem deletar nada antes)
        const newPayments = generatePaymentsForRental(rental);
        console.log(`  ➕ Gerando ${newPayments.length} novos recebimentos`);

        // Inserir TODOS os novos recebimentos
        if (newPayments.length > 0) {
          const { error: insertError } = await supabase
            .from("payments")
            .insert(newPayments);

          if (insertError) {
            throw new Error(`Erro ao inserir novos recebimentos: ${insertError.message}`);
          }

          totalCreated += newPayments.length;
          console.log(`  ✅ ${newPayments.length} novos recebimentos criados com sucesso`);
        }

        // Agora buscar TODOS os recebimentos dessa locação para limpar duplicatas
        const { data: allPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("rental_id", rental.id)
          .order("due_date", { ascending: true });

        if (paymentsError) {
          throw new Error(`Erro ao buscar recebimentos: ${paymentsError.message}`);
        }

        // Agrupar por data de vencimento
        const paymentsByDate: Record<string, any[]> = {};
        allPayments?.forEach(payment => {
          if (!paymentsByDate[payment.due_date]) {
            paymentsByDate[payment.due_date] = [];
          }
          paymentsByDate[payment.due_date].push(payment);
        });

        // Para cada data, se houver duplicata com "pago" + "pendente", deletar o "pendente"
        const idsToDelete: string[] = [];
        for (const [dueDate, payments] of Object.entries(paymentsByDate)) {
          if (payments.length > 1) {
            const hasPaid = payments.some(p => p.status === "paid");
            const pendingPayments = payments.filter(p => p.status === "pending");
            
            if (hasPaid && pendingPayments.length > 0) {
              // Deletar todos os pendentes dessa data (já que há um pago)
              pendingPayments.forEach(p => idsToDelete.push(p.id));
              console.log(`  🗑️ Duplicata encontrada em ${dueDate}: deletando ${pendingPayments.length} pendente(s)`);
            }
          }
        }

        // Deletar duplicatas pendentes
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("payments")
            .delete()
            .in("id", idsToDelete);

          if (deleteError) {
            throw new Error(`Erro ao deletar duplicatas: ${deleteError.message}`);
          }

          totalDuplicatesRemoved += idsToDelete.length;
          console.log(`  ✅ ${idsToDelete.length} duplicata(s) removida(s)\n`);
        }

        results.push({
          rental_id: rental.id,
          success: true,
          new_created: newPayments.length,
          duplicates_removed: idsToDelete.length
        });

      } catch (error) {
        console.error(`  ❌ Erro ao processar locação ${rental.id}:`, error);
        results.push({
          rental_id: rental.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`\n✨ Correção concluída!`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   ✅ Total criados: ${totalCreated}`);
    console.log(`   🗑️ Total duplicatas removidas: ${totalDuplicatesRemoved}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Correção concluída! ${successCount} locações processadas.`,
        rentalsProcessed: successCount,
        paymentsCreated: totalCreated,
        duplicatesRemoved: totalDuplicatesRemoved,
        details: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});