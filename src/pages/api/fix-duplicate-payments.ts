import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

interface DuplicateInfo {
  rentalId: string;
  month: number;
  year: number;
  paymentIds: string[];
  dueDates: string[];
}

interface FixResult {
  success: boolean;
  rentalsAnalyzed: number;
  duplicatesFound: number;
  duplicatesFixed: number;
  errors: string[];
  details: Array<{
    rentalId: string;
    propertyId: string;
    duplicates: DuplicateInfo[];
    action: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dryRun = true } = req.body;

  const result: FixResult = {
    success: true,
    rentalsAnalyzed: 0,
    duplicatesFound: 0,
    duplicatesFixed: 0,
    errors: [],
    details: [],
  };

  try {
    console.log("=".repeat(80));
    console.log("🔍 INICIANDO ANÁLISE DE RECEBIMENTOS DUPLICADOS");
    console.log("Modo:", dryRun ? "DRY RUN (apenas análise)" : "CORREÇÃO ATIVA");
    console.log("=".repeat(80));

    // 1. Buscar todas as locações ativas
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("id, property_id, start_date, payment_day")
      .eq("is_active", true)
      .order("start_date", { ascending: false });

    if (rentalsError) throw rentalsError;
    if (!rentals || rentals.length === 0) {
      return res.json({
        ...result,
        message: "Nenhuma locação ativa encontrada",
      });
    }

    result.rentalsAnalyzed = rentals.length;
    console.log(`📋 Analisando ${rentals.length} locações ativas...\n`);

    // 2. Para cada locação, verificar duplicatas
    for (const rental of rentals) {
      console.log(`\n🏠 Locação: ${rental.id} (Imóvel: ${rental.property_id})`);

      // Buscar todos os pagamentos desta locação
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, due_date, reference_month, reference_year, status, expected_amount")
        .eq("rental_id", rental.id)
        .order("due_date", { ascending: true });

      if (paymentsError) {
        result.errors.push(`Erro ao buscar pagamentos da locação ${rental.id}: ${paymentsError.message}`);
        continue;
      }

      if (!payments || payments.length === 0) {
        console.log("   ⚠️ Nenhum pagamento encontrado");
        continue;
      }

      console.log(`   📊 Total de pagamentos: ${payments.length}`);

      // 3. Agrupar por mês/ano de referência
      const paymentsByMonth = new Map<string, typeof payments>();

      for (const payment of payments) {
        // Extrair mês/ano da data de vencimento
        const dueDate = new Date(payment.due_date + "T00:00:00");
        const month = dueDate.getMonth() + 1; // 1-12
        const year = dueDate.getFullYear();
        const key = `${year}-${String(month).padStart(2, "0")}`;

        if (!paymentsByMonth.has(key)) {
          paymentsByMonth.set(key, []);
        }
        paymentsByMonth.get(key)!.push(payment);
      }

      // 4. Identificar duplicatas (mais de 1 pagamento no mesmo mês)
      const duplicates: DuplicateInfo[] = [];

      for (const [key, monthPayments] of paymentsByMonth.entries()) {
        if (monthPayments.length > 1) {
          const [year, month] = key.split("-").map(Number);
          duplicates.push({
            rentalId: rental.id,
            month,
            year,
            paymentIds: monthPayments.map((p) => p.id),
            dueDates: monthPayments.map((p) => p.due_date),
          });

          console.log(`   🔴 DUPLICATA encontrada em ${month}/${year}:`);
          monthPayments.forEach((p, idx) => {
            console.log(`      ${idx + 1}. ID: ${p.id.substring(0, 8)}... | Venc: ${p.due_date} | Status: ${p.status} | Valor: R$ ${p.expected_amount}`);
          });
        }
      }

      if (duplicates.length > 0) {
        result.duplicatesFound += duplicates.length;

        const detail = {
          rentalId: rental.id,
          propertyId: rental.property_id,
          duplicates,
          action: "",
        };

        // 5. CORRIGIR duplicatas (se não for dry run)
        if (!dryRun) {
          console.log(`   🔧 Corrigindo duplicatas...`);

          for (const dup of duplicates) {
            // Estratégia: Manter o PRIMEIRO pagamento, deletar os demais
            // (ou manter o PAGO se houver algum pago)
            const monthPayments = paymentsByMonth.get(`${dup.year}-${String(dup.month).padStart(2, "0")}`)!;

            // Verificar se algum está pago
            const paidPayment = monthPayments.find((p) => p.status === "paid");
            let toKeep: typeof monthPayments[0];
            let toDelete: typeof monthPayments = [];

            if (paidPayment) {
              // Manter o pago, deletar os outros
              toKeep = paidPayment;
              toDelete = monthPayments.filter((p) => p.id !== paidPayment.id);
            } else {
              // Manter o primeiro (com menor data), deletar os outros
              toKeep = monthPayments[0];
              toDelete = monthPayments.slice(1);
            }

            console.log(`      ✅ Mantendo: ${toKeep.id.substring(0, 8)}... (${toKeep.due_date})`);

            // Deletar os demais
            for (const payment of toDelete) {
              console.log(`      🗑️ Deletando: ${payment.id.substring(0, 8)}... (${payment.due_date})`);

              const { error: deleteError } = await supabase
                .from("payments")
                .delete()
                .eq("id", payment.id);

              if (deleteError) {
                result.errors.push(`Erro ao deletar pagamento ${payment.id}: ${deleteError.message}`);
              } else {
                result.duplicatesFixed++;
              }
            }
          }

          detail.action = `Corrigidas ${duplicates.length} duplicatas`;
        } else {
          detail.action = `Encontradas ${duplicates.length} duplicatas (não corrigidas - dry run)`;
        }

        result.details.push(detail);
      } else {
        console.log(`   ✅ Nenhuma duplicata encontrada`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 RESUMO DA ANÁLISE:");
    console.log(`   Locações analisadas: ${result.rentalsAnalyzed}`);
    console.log(`   Duplicatas encontradas: ${result.duplicatesFound}`);
    console.log(`   Duplicatas corrigidas: ${result.duplicatesFixed}`);
    console.log(`   Erros: ${result.errors.length}`);
    console.log("=".repeat(80));

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO:", error);
    result.success = false;
    result.errors.push(error.message);
    return res.status(500).json(result);
  }
}