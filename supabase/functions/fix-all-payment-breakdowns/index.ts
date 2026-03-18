import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Rental {
  id: string;
  rent_value: number;
  garage_value: number;
  has_garage: boolean;
}

interface Payment {
  id: string;
  rental_id: string;
  installment: number | null;
  total_installments: number;
  expected_amount: number;
  breakdown: any[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("🔄 Iniciando correção de breakdowns...");

    // Buscar TODAS as locações
    const { data: rentals, error: rentalsError } = await supabaseClient
      .from("rentals")
      .select("id, rent_value, garage_value, has_garage")
      .in("status", ["active", "ended"]);

    if (rentalsError) {
      throw new Error(`Erro ao buscar locações: ${rentalsError.message}`);
    }

    console.log(`📋 ${rentals?.length || 0} locações encontradas`);

    // Buscar TODOS os pagamentos pendentes
    const { data: payments, error: paymentsError } = await supabaseClient
      .from("payments")
      .select("id, rental_id, installment, total_installments, expected_amount, breakdown")
      .eq("status", "pending");

    if (paymentsError) {
      throw new Error(`Erro ao buscar pagamentos: ${paymentsError.message}`);
    }

    console.log(`💰 ${payments?.length || 0} pagamentos pendentes encontrados`);

    let updatedCount = 0;
    let errorCount = 0;

    // Processar cada pagamento
    for (const payment of payments || []) {
      try {
        const rental = rentals?.find((r) => r.id === payment.rental_id);
        if (!rental) {
          console.log(`⚠️ Locação não encontrada para pagamento ${payment.id}`);
          errorCount++;
          continue;
        }

        // Calcular valores corretos
        const rentValue = Number(rental.rent_value) || 0;
        const garageValue = rental.has_garage ? (Number(rental.garage_value) || 0) : 0;

        // Verificar se é parcela proporcional
        const isProportional =
          payment.installment === null ||
          payment.installment === 1 ||
          payment.installment === payment.total_installments;

        let newBreakdown: any[] = [];

        if (isProportional && payment.expected_amount) {
          // Parcela proporcional - calcular baseado no expected_amount
          const expectedAmount = Number(payment.expected_amount);
          const totalMonthly = rentValue + garageValue;

          if (totalMonthly > 0) {
            const proportion = expectedAmount / totalMonthly;
            const proportionalRent = rentValue * proportion;
            const proportionalGarage = garageValue * proportion;

            // Calcular dias proporcionais (aproximado)
            const days = Math.round(proportion * 30);

            newBreakdown = [
              {
                type: "addition",
                amount: parseFloat(proportionalRent.toFixed(2)),
                description: `Aluguel - Parcela ${payment.installment || 1} (${days} dias)`,
              },
            ];

            if (garageValue > 0) {
              newBreakdown.push({
                type: "addition",
                amount: parseFloat(proportionalGarage.toFixed(2)),
                description: `Garagem Proporcional (${days} dias)`,
              });
            }
          }
        } else {
          // Parcela integral
          newBreakdown = [
            {
              type: "addition",
              amount: rentValue,
              description: "Aluguel",
            },
          ];

          if (garageValue > 0) {
            newBreakdown.push({
              type: "addition",
              amount: garageValue,
              description: "Garagem",
            });
          }
        }

        // Atualizar breakdown no banco
        const { error: updateError } = await supabaseClient
          .from("payments")
          .update({ breakdown: newBreakdown })
          .eq("id", payment.id);

        if (updateError) {
          console.log(`❌ Erro ao atualizar pagamento ${payment.id}: ${updateError.message}`);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 10 === 0) {
            console.log(`✅ ${updatedCount} pagamentos atualizados...`);
          }
        }
      } catch (error: any) {
        console.log(`❌ Erro ao processar pagamento ${payment.id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`
✅ Correção concluída!`);
    console.log(`📊 Atualizados: ${updatedCount}`);
    console.log(`❌ Erros: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Breakdowns corrigidos com sucesso!`,
        updated: updatedCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});