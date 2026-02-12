import { supabase } from "@/integrations/supabase/client";
import { parseISO, getMonth, getYear, differenceInMonths } from "date-fns";
import { calculateCorrectedDeposit } from "./igpmService";
import { recalculateInstallmentNumbers } from "./paymentService";

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
 * 2. Busca ou cria recebimento do mês da rescisão
 * 3. Atualiza recebimento com:
 *    - Aluguel proporcional
 *    - Multa rescisória
 *    - Caução corrigido (negativo)
 * 4. Deleta recebimentos do mês SEGUINTE em diante
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

  // PASSO 3: Buscar ou criar recebimento do mês da rescisão
  console.log("\n🔍 Buscando recebimento do mês da rescisão...");
  
  const { data: existingPayment, error: fetchError } = await supabase
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

  let paymentOfMonth = existingPayment;

  // Se não encontrou, criar o recebimento
  if (!paymentOfMonth) {
    console.log("⚠️ Recebimento não encontrado. Criando novo recebimento...");
    
    // Buscar dados do rental para criar o recebimento
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("*")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      console.error("❌ Erro ao buscar rental:", rentalError);
      throw new Error("Não foi possível buscar dados da locação");
    }

    // Criar novo recebimento para o mês da rescisão
    const dueDate = new Date(terminationYear, terminationMonth - 1, paymentDay);
    
    const { data: newPayment, error: createError } = await supabase
      .from("payments")
      .insert({
        rental_id: rentalId,
        due_date: dueDate.toISOString().split("T")[0],
        expected_amount: proportionalRent,
        reference_month: String(terminationMonth),
        reference_year: String(terminationYear),
        status: "pending"
      })
      .select()
      .single();

    if (createError || !newPayment) {
      console.error("❌ Erro ao criar recebimento:", createError);
      throw new Error("Não foi possível criar recebimento do mês da rescisão");
    }

    console.log("✅ Recebimento criado:", newPayment.id);
    paymentOfMonth = newPayment;
  } else {
    console.log("✅ Recebimento encontrado:", paymentOfMonth.id);
  }

  // PASSO 4: Calcular caução corrigido pela inflação usando IGPM real
  const rentalStartDate = await supabase
    .from("rentals")
    .select("start_date")
    .eq("id", rentalId)
    .single();

  const startDate = rentalStartDate.data?.start_date || paymentOfMonth.due_date;
  
  // Calcular correção IGPM real
  const igpmCorrection = calculateCorrectedDeposit(
    depositAmount,
    startDate,
    terminationDate
  );

  const correctedDeposit = igpmCorrection.correctedAmount;

  console.log("💰 Correção do caução pelo IGPM:", {
    valorOriginal: depositAmount,
    mesesAtivo: igpmCorrection.months,
    igpmAcumulado: `${igpmCorrection.poupancaPercentage.toFixed(2)}%`,
    valorCorrigido: correctedDeposit.toFixed(2),
    detalhamento: igpmCorrection.poupancaDetails
  });

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
      description: "Devolução de Caução (corrigido pela Taxa da Poupança)",
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

  // ==========================================
  // 4. ATUALIZAR DATA FIM DO CONTRATO
  // ==========================================
  console.log("\n📅 Atualizando data fim do contrato...");

  const { error: updateRentalError } = await supabase
    .from("rentals")
    .update({
      end_date: terminationDate,
      updated_at: new Date().toISOString()
    })
    .eq("id", rentalId);

  if (updateRentalError) {
    console.error("❌ Erro ao atualizar data fim do contrato:", updateRentalError);
    throw updateRentalError;
  }

  console.log(`✅ Data fim do contrato atualizada para: ${terminationDate}`);

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

  // Corrigido: usar o tamanho do array paymentsToDelete ou 0
  const deletedCount = paymentsToDelete?.length || 0;
  console.log(`✅ ${deletedCount} recebimentos futuros foram deletados com sucesso`);

  // ==========================================
  // 6. ATUALIZAR TOTAL DE PARCELAS
  // ==========================================

  console.log(`\n📊 PASSO 9: Recalcular números de parcelas`);
  console.log(`Recalculando para rental_id: ${rentalId}`);

  // Chamar função do paymentService para recalcular parcelas
  const totalPaymentsAfter = await recalculateInstallmentNumbers(rentalId);

  console.log(`✅ Recálculo concluído!`);
  console.log(`Total de parcelas após recálculo: ${totalPaymentsAfter}`);

  console.log("\n=== RESUMO DA RESCISÃO ===");
  console.log(`✅ Recebimento de ${terminationMonth}/${terminationYear} atualizado com R$ ${totalAmount.toFixed(2)}`);
  console.log(`✅ Recebimentos deletados: ${paymentsToDelete?.length || 0} (a partir de ${nextMonth}/${nextYear})`);
  console.log(`⚠️  Status NÃO alterado: Locação, imóvel e inquilino permanecem ativos até o pagamento`);
  console.log(`💡 Despesas de reforma podem ser adicionadas depois na tela de Recebimentos`);
  console.log("=== FIM processContractTermination ===");
}