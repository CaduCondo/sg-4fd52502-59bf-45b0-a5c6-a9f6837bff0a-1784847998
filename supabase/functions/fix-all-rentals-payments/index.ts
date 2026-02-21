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

  console.log(`📅 Processando locação ${rental.id}:`);
  console.log(`   Início: ${rental.start_date}, Fim: ${rental.end_date}`);
  console.log(`   Dia pagamento: ${paymentDay}, Valor mensal: ${monthlyValue}`);

  // Parse first_payment_month (formato: "2026-02")
  const [firstYear, firstMonth] = rental.first_payment_month.split("-").map(Number);

  // Calcular primeira data de vencimento
  let firstDueDate = new Date(firstYear, firstMonth - 1, paymentDay);
  
  // Se o dia de pagamento for maior que os dias do mês, ajustar para último dia
  const lastDayOfMonth = new Date(firstYear, firstMonth, 0).getDate();
  if (paymentDay > lastDayOfMonth) {
    firstDueDate.setDate(lastDayOfMonth);
  }

  console.log(`   Primeiro vencimento: ${firstDueDate.toISOString().split('T')[0]}`);

  // Primeiro recebimento (proporcional)
  const firstPaymentDays = calculateProportionalDays(startDate, firstDueDate);
  const firstPaymentValue = calculateProportionalValue(monthlyValue, firstPaymentDays);

  const rentalBreakdown = rental.garage_value > 0 ? [
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
    rental_breakdown: rentalBreakdown
  });

  console.log(`   ✅ Primeiro pagamento: ${firstDueDate.toISOString().split('T')[0]} - R$ ${firstPaymentValue.toFixed(2)} (${firstPaymentDays} dias)`);

  // Recebimentos intermediários (100%)
  let currentDate = new Date(firstDueDate);
  currentDate.setMonth(currentDate.getMonth() + 1);

  let monthCount = 0;
  while (currentDate < endDate) {
    monthCount++;
    
    // Calcular data de vencimento para o mês atual
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let dueDate = new Date(year, month, paymentDay);
    
    // Ajustar se o dia não existe no mês
    const lastDay = new Date(year, month + 1, 0).getDate();
    if (paymentDay > lastDay) {
      dueDate.setDate(lastDay);
    }

    // Verificar se ainda está dentro do período do contrato
    if (dueDate >= endDate) {
      console.log(`   ⏭️ Data ${dueDate.toISOString().split('T')[0]} >= fim do contrato, parando intermediários`);
      break;
    }

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
      due_date: dueDate.toISOString().split("T")[0],
      amount: monthlyValue,
      status: "pending",
      payment_type: "rental",
      rental_breakdown: intermediateBreakdown
    });

    console.log(`   ✅ Pagamento intermediário #${monthCount}: ${dueDate.toISOString().split('T')[0]} - R$ ${monthlyValue.toFixed(2)}`);

    // Avançar para o próximo mês
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Último recebimento (proporcional se necessário)
  if (payments.length > 0) {
    const lastIntermediateDate = new Date(payments[payments.length - 1].due_date + "T00:00:00");
    
    // Calcular próxima data de vencimento após o último intermediário
    const nextMonth = new Date(lastIntermediateDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth();
    let nextDueDate = new Date(year, month, paymentDay);
    
    // Ajustar se o dia não existe no mês
    const lastDay = new Date(year, month + 1, 0).getDate();
    if (paymentDay > lastDay) {
      nextDueDate.setDate(lastDay);
    }

    console.log(`   🔍 Último intermediário: ${lastIntermediateDate.toISOString().split('T')[0]}`);
    console.log(`   🔍 Próximo vencimento: ${nextDueDate.toISOString().split('T')[0]}`);
    console.log(`   🔍 Fim do contrato: ${endDate.toISOString().split('T')[0]}`);

    // Se a próxima data de vencimento é DEPOIS do fim do contrato,
    // criar um pagamento proporcional do último vencimento até o fim
    if (nextDueDate > endDate) {
      const lastPaymentDays = calculateProportionalDays(lastIntermediateDate, endDate);
      
      // Só criar se houver pelo menos 1 dia
      if (lastPaymentDays > 0) {
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
    } else {
      // Se o próximo vencimento é ANTES do fim do contrato,
      // ainda há meses inteiros para cobrir
      console.log(`   ⚠️ Ainda há período descoberto entre ${nextDueDate.toISOString().split('T')[0]} e ${endDate.toISOString().split('T')[0]}`);
      
      // Adicionar pagamentos mensais faltantes
      let coverDate = new Date(nextDueDate);
      while (coverDate < endDate) {
        const year = coverDate.getFullYear();
        const month = coverDate.getMonth();
        let dueDate = new Date(year, month, paymentDay);
        
        const lastDay = new Date(year, month + 1, 0).getDate();
        if (paymentDay > lastDay) {
          dueDate.setDate(lastDay);
        }

        if (dueDate >= endDate) break;

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
          due_date: dueDate.toISOString().split("T")[0],
          amount: monthlyValue,
          status: "pending",
          payment_type: "rental",
          rental_breakdown: intermediateBreakdown
        });

        console.log(`   ✅ Pagamento adicional: ${dueDate.toISOString().split('T')[0]} - R$ ${monthlyValue.toFixed(2)}`);

        coverDate.setMonth(coverDate.getMonth() + 1);
      }

      // Criar último proporcional se necessário
      if (payments.length > 0) {
        const finalLastDate = new Date(payments[payments.length - 1].due_date + "T00:00:00");
        const finalDays = calculateProportionalDays(finalLastDate, endDate);
        
        if (finalDays > 0 && finalDays < 30) {
          const finalValue = calculateProportionalValue(monthlyValue, finalDays);

          const finalBreakdown = rental.garage_value > 0 ? [
            {
              type: "charge",
              description: "Aluguel (proporcional)",
              amount: calculateProportionalValue(rental.rental_value, finalDays)
            },
            {
              type: "charge",
              description: "Vaga (proporcional)",
              amount: calculateProportionalValue(rental.garage_value, finalDays)
            }
          ] : [
            {
              type: "charge",
              description: "Aluguel (proporcional)",
              amount: finalValue
            }
          ];

          payments.push({
            rental_id: rental.id,
            property_id: rental.property_id,
            tenant_id: rental.tenant_id,
            due_date: endDate.toISOString().split("T")[0],
            amount: finalValue,
            status: "pending",
            payment_type: "rental",
            rental_breakdown: finalBreakdown
          });

          console.log(`   ✅ Último pagamento final proporcional: ${endDate.toISOString().split('T')[0]} - R$ ${finalValue.toFixed(2)} (${finalDays} dias)`);
        }
      }
    }
  }

  console.log(`   📊 Total de pagamentos gerados: ${payments.length}`);
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

    console.log("🔧 Iniciando correção de todas as locações...");

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
          paymentsDeleted: 0,
          paymentsCreated: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Encontradas ${rentals.length} locações ativas`);

    let totalDeleted = 0;
    let totalCreated = 0;
    const results = [];

    // 2. Processar cada locação
    for (const rental of rentals) {
      try {
        console.log(`\n🏠 Processando locação ${rental.id}...`);

        // Buscar recebimentos existentes
        const { data: existingPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("rental_id", rental.id)
          .order("due_date", { ascending: true });

        if (paymentsError) {
          throw new Error(`Erro ao buscar recebimentos: ${paymentsError.message}`);
        }

        // Separar pagos e pendentes
        const paidPayments = existingPayments?.filter(p => p.status === "paid") || [];
        const pendingPayments = existingPayments?.filter(p => p.status === "pending") || [];

        console.log(`  💰 Recebimentos existentes: ${existingPayments?.length || 0}`);
        console.log(`  ✅ Pagos: ${paidPayments.length}`);
        console.log(`  ⏳ Pendentes: ${pendingPayments.length}`);

        // Deletar apenas recebimentos pendentes
        if (pendingPayments.length > 0) {
          const pendingIds = pendingPayments.map(p => p.id);
          const { error: deleteError } = await supabase
            .from("payments")
            .delete()
            .in("id", pendingIds);

          if (deleteError) {
            throw new Error(`Erro ao deletar recebimentos pendentes: ${deleteError.message}`);
          }

          totalDeleted += pendingPayments.length;
          console.log(`  🗑️ Deletados ${pendingPayments.length} recebimentos pendentes`);
        }

        // Gerar novos recebimentos
        const newPayments = generatePaymentsForRental(rental);
        console.log(`  ➕ Gerando ${newPayments.length} novos recebimentos`);

        // Inserir novos recebimentos
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

        results.push({
          rental_id: rental.id,
          success: true,
          paid_kept: paidPayments.length,
          pending_deleted: pendingPayments.length,
          new_created: newPayments.length
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
    console.log(`   🗑️ Total deletados: ${totalDeleted}`);
    console.log(`   ✅ Total criados: ${totalCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Correção concluída com sucesso!`,
        rentalsProcessed: successCount,
        paymentsDeleted: totalDeleted,
        paymentsCreated: totalCreated,
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