import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

/**
 * API para corrigir status de pagamentos marcados como "partial" 
 * mas que já foram pagos completamente
 * 
 * Acesse: /api/fix-partial-status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Buscando pagamentos com status inconsistente...");

    // Buscar todos os pagamentos com status "partial"
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("id, expected_amount, paid_amount, late_fee, interest, discount_amount, status")
      .eq("status", "partial");

    if (fetchError) {
      console.error("❌ Erro ao buscar pagamentos:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!payments || payments.length === 0) {
      console.log("✅ Nenhum pagamento parcial encontrado");
      return res.status(200).json({
        success: true,
        message: "Nenhum pagamento parcial encontrado",
        fixed: 0,
      });
    }

    console.log(`📊 Encontrados ${payments.length} pagamentos parciais`);

    const toFix = [];
    const results = {
      total: payments.length,
      fixed: 0,
      alreadyCorrect: 0,
      errors: [] as string[],
    };

    // Verificar cada pagamento
    for (const payment of payments) {
      const expectedAmount = Number(payment.expected_amount || 0);
      const paidAmount = Number(payment.paid_amount || 0);
      const lateFee = Number(payment.late_fee || 0);
      const interest = Number(payment.interest || 0);
      const discount = Number(payment.discount_amount || 0);

      // Calcular total esperado (com taxas)
      const totalExpected = expectedAmount + lateFee + interest - discount;
      
      // Calcular diferença
      const difference = Math.abs(paidAmount - totalExpected);

      console.log(`\n📋 Pagamento ${payment.id.substring(0, 8)}...`);
      console.log(`  Esperado: R$ ${totalExpected.toFixed(2)}`);
      console.log(`  Pago: R$ ${paidAmount.toFixed(2)}`);
      console.log(`  Diferença: R$ ${difference.toFixed(2)}`);

      // Se diferença < R$ 0.01, considerar pago
      if (difference < 0.01) {
        console.log(`  ✅ Deveria estar PAGO (diferença < R$ 0,01)`);
        toFix.push(payment.id);
      } else {
        console.log(`  ℹ️ Status parcial está correto (restante: R$ ${(totalExpected - paidAmount).toFixed(2)})`);
        results.alreadyCorrect++;
      }
    }

    if (toFix.length === 0) {
      console.log("\n✅ Todos os pagamentos parciais estão corretos!");
      return res.status(200).json({
        success: true,
        message: "Todos os pagamentos parciais estão corretos",
        ...results,
      });
    }

    console.log(`\n🔧 Corrigindo ${toFix.length} pagamentos...`);

    // Atualizar status para "paid"
    const { data: updated, error: updateError } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .in("id", toFix)
      .select();

    if (updateError) {
      console.error("❌ Erro ao atualizar pagamentos:", updateError);
      results.errors.push(updateError.message);
      return res.status(500).json({
        success: false,
        error: updateError.message,
        ...results,
      });
    }

    results.fixed = updated?.length || 0;

    console.log(`\n✅ ${results.fixed} pagamentos corrigidos com sucesso!`);

    return res.status(200).json({
      success: true,
      message: `${results.fixed} pagamentos corrigidos com sucesso`,
      ...results,
      fixed_ids: toFix,
    });

  } catch (error: any) {
    console.error("❌ Erro inesperado:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro desconhecido",
    });
  }
}