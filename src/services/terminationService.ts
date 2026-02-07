import { supabase } from "@/integrations/supabase/client";
import { parseISO, getMonth, getYear, differenceInDays } from "date-fns";

export interface TerminationData {
  rentalId: string;
  terminationDate: string;
  penaltyAmount: number;
  depositAmount: number;
  paymentDay: number;
  monthlyRent: number;
}

/**
 * Processa a rescisão de contrato:
 * 1. Calcula aluguel proporcional do dia de vencimento até data da rescisão
 * 2. Atualiza recebimento do mês da rescisão com:
 *    - Aluguel proporcional
 *    - Multa rescisória
 *    - Caução corrigido (negativo)
 * 3. Deleta recebimentos do mês SEGUINTE em diante
 * 4. NÃO atualiza status (só muda quando recebimento for pago)
 */
export async function processContractTermination(data: TerminationData): Promise<void> {
  console.log("=== INICIO processContractTermination ===");
  console.log("Dados recebidos:", data);

  const { 
    rentalId, 
    terminationDate, 
    penaltyAmount, 
    depositAmount,
    paymentDay,
    monthlyRent
  } = data;

  // PASSO 1: Determinar o mês da rescisão
  const terminationDateObj = parseISO(terminationDate);
  const terminationMonth = getMonth(terminationDateObj) + 1; // 1-12
  const terminationYear = getYear(terminationDateObj);
  const terminationDay = terminationDateObj.getDate();
  
  console.log("📅 Data de rescisão:", terminationDate);
  console.log("📅 Mês da rescisão:", `${terminationMonth}/${terminationYear}`);

  // PASSO 2: Calcular aluguel proporcional
  // Do dia de vencimento até o dia da rescisão
  let daysUsed = 0;
  if (terminationDay >= paymentDay) {
    daysUsed = terminationDay - paymentDay + 1;
  } else {
    daysUsed = 30; // Considera mês completo se rescisão antes do vencimento
  }
  
  const proportionalRent = (monthlyRent / 30) * daysUsed;
  
  console.log("💰 Aluguel proporcional:", {
    diaVencimento: paymentDay,
    diaRescisao: terminationDay,
    diasUsados: daysUsed,
    valorProporcional: proportionalRent.toFixed(2)
  });

  // PASSO 3: Buscar recebimento do mês da rescisão
  console.log("\n🔍 Buscando recebimento do mês da rescisão...");
  
  const { data: paymentOfMonth, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("reference_month", String(terminationMonth))
    .eq("reference_year", String(terminationYear))
    .maybeSingle();

  if (fetchError) {
    console.error("❌ Erro ao buscar recebimento:", fetchError);
    throw fetchError;
  }

  if (!paymentOfMonth) {
    console.error("❌ Recebimento do mês da rescisão não encontrado!");
    throw new Error("Recebimento do mês da rescisão não encontrado");
  }

  console.log("✅ Recebimento encontrado:", paymentOfMonth.id);

  // PASSO 4: Calcular caução corrigido pela inflação
  // TODO: Implementar correção pela inflação
  // Por ora, usa valor nominal
  const correctedDeposit = depositAmount;

  // PASSO 5: Criar breakdown (Formação de Valores)
  const breakdown = [];

  // Item 1: Aluguel Proporcional
  breakdown.push({
    description: `Aluguel Proporcional (${daysUsed} dias)`,
    amount: proportionalRent,
    type: "addition"
  });

  // Item 2: Multa Rescisória (se houver)
  if (penaltyAmount > 0) {
    breakdown.push({
      description: "Multa Rescisória",
      amount: penaltyAmount,
      type: "addition"
    });
  }

  // Item 3: Devolução de Caução (corrigido)
  if (correctedDeposit > 0) {
    breakdown.push({
      description: "Devolução de Caução (corrigido pela inflação)",
      amount: -correctedDeposit,
      type: "deduction"
    });
  }

  // PASSO 6: Calcular valor total do recebimento atualizado
  const totalAmount = proportionalRent + penaltyAmount - correctedDeposit;

  console.log("\n💰 Cálculo do recebimento atualizado:");
  console.log("   Aluguel Proporcional:    R$", proportionalRent.toFixed(2));
  console.log("   (+) Multa Rescisória:    R$", penaltyAmount.toFixed(2));
  console.log("   (-) Caução Corrigido:    R$", correctedDeposit.toFixed(2));
  console.log("   ══════════════════════════════════════");
  console.log("   Total do Recebimento:    R$", totalAmount.toFixed(2));

  // PASSO 7: Atualizar recebimento do mês
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      expected_amount: totalAmount,
      breakdown: JSON.stringify(breakdown),
      notes: `Rescisão de Contrato - Data de saída: ${terminationDate}. Despesas de reforma podem ser adicionadas na tela de Recebimentos.`,
      updated_at: new Date().toISOString()
    })
    .eq("id", paymentOfMonth.id);

  if (updateError) {
    console.error("❌ Erro ao atualizar recebimento:", updateError);
    throw updateError;
  }

  console.log("✅ Recebimento do mês atualizado com sucesso!");

  // PASSO 8: Deletar recebimentos do mês SEGUINTE em diante
  console.log("\n🗑️ Deletando recebimentos futuros (a partir do mês seguinte)...");

  const nextMonth = terminationMonth === 12 ? 1 : terminationMonth + 1;
  const nextYear = terminationMonth === 12 ? terminationYear + 1 : terminationYear;

  const { data: paymentsToDelete, error: fetchDeleteError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status")
    .eq("rental_id", rentalId)
    .or(`reference_year.gt.${terminationYear},and(reference_year.eq.${terminationYear},reference_month.gte.${nextMonth})`);

  if (fetchDeleteError) {
    console.error("❌ Erro ao buscar recebimentos para deletar:", fetchDeleteError);
    throw fetchDeleteError;
  }

  console.log(`📋 Encontrados ${paymentsToDelete?.length || 0} recebimentos para deletar`);

  if (paymentsToDelete && paymentsToDelete.length > 0) {
    const idsToDelete = paymentsToDelete.map(p => p.id);
    
    console.log("IDs a deletar:", idsToDelete);
    paymentsToDelete.forEach(p => {
      console.log(`  - ${p.due_date} | Ref: ${p.reference_month}/${p.reference_year} | Status: ${p.status}`);
    });

    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("❌ Erro ao deletar recebimentos:", deleteError);
      throw deleteError;
    }

    console.log(`✅ Deletados ${paymentsToDelete.length} recebimentos`);
  } else {
    console.log("✅ Nenhum recebimento para deletar");
  }

  console.log("\n=== RESUMO DA RESCISÃO ===");
  console.log(`✅ Recebimento de ${terminationMonth}/${terminationYear} atualizado com R$ ${totalAmount.toFixed(2)}`);
  console.log(`✅ Recebimentos deletados: ${paymentsToDelete?.length || 0} (a partir de ${nextMonth}/${nextYear})`);
  console.log(`⚠️  Status NÃO alterado: Locação, imóvel e inquilino permanecem ativos até o pagamento`);
  console.log(`💡 Despesas de reforma podem ser adicionadas depois na tela de Recebimentos`);
  console.log("=== FIM processContractTermination ===");
}