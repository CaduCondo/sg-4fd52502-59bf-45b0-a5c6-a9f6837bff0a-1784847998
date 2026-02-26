import { supabase } from "@/integrations/supabase/client";
import { parseISO, getMonth, getYear } from "date-fns";
import { calculateCorrectedDeposit } from "./igpmService";

export interface TerminationData {
  rentalId: string;
  terminationDate: string;
  penaltyAmount: number;
  depositAmount: number;
  paymentDay: number;
  monthlyRent: number;
}

/**
 * Processa a rescisão de contrato - VERSÃO CORRIGIDA DEFINITIVAMENTE
 * 
 * FLUXO CORRETO:
 * 1. Calcula valores (proporcional + multa - caução)
 * 2. Busca/cria recebimento do mês da rescisão
 * 3. Atualiza recebimento com valores calculados
 * 4. Atualiza data fim do contrato
 * 5. DELETA pagamentos futuros (do mês SEGUINTE em diante)
 * 6. RECALCULA números de parcelas de TODOS os pagamentos restantes
 * 7. VERIFICA se o recálculo funcionou corretamente
 */
export async function processContractTermination(data: TerminationData): Promise<void> {
  console.log("\n".repeat(3));
  console.log("═".repeat(80));
  console.log("🚀 INICIO processContractTermination - VERSÃO CORRIGIDA");
  console.log("═".repeat(80));
  console.log("Dados recebidos:", JSON.stringify(data, null, 2));

  const { 
    rentalId, 
    terminationDate, 
    penaltyAmount, 
    depositAmount,
    paymentDay,
    monthlyRent
  } = data;

  // ==========================================
  // PASSO 1: Determinar o mês da rescisão
  // ==========================================
  console.log("\n📅 PASSO 1: Determinar mês da rescisão");
  
  const terminationDateObj = parseISO(terminationDate);
  const terminationMonth = getMonth(terminationDateObj) + 1; // 1-12
  const terminationYear = getYear(terminationDateObj);
  const terminationDay = terminationDateObj.getDate();
  
  console.log(`  Data de rescisão: ${terminationDate}`);
  console.log(`  Mês/Ano: ${terminationMonth}/${terminationYear}`);
  console.log(`  Dia: ${terminationDay}`);

  // ==========================================
  // PASSO 2: Calcular aluguel proporcional
  // ==========================================
  console.log("\n💰 PASSO 2: Calcular aluguel proporcional");
  
  let fullMonthRent = 0;
  let proportionalRent = 0;
  let daysUsed = 0;

  if (terminationDay >= paymentDay) {
    // ✅ Rescisão APÓS vencimento: mês cheio + proporcional entre vencimento e rescisão
    console.log("  🔍 Rescisão APÓS vencimento - cobra mês cheio + proporcional dos dias extras");
    
    fullMonthRent = monthlyRent; // Mês cheio (já vencido)
    daysUsed = terminationDay - paymentDay + 1; // Dias entre vencimento e rescisão (incluindo ambos)
    proportionalRent = (monthlyRent / 30) * daysUsed;
    
    console.log(`  Mês cheio: R$ ${fullMonthRent.toFixed(2)}`);
    console.log(`  Dias extras (${paymentDay} a ${terminationDay}): ${daysUsed}`);
    console.log(`  Valor proporcional: R$ ${proportionalRent.toFixed(2)}`);
  } else {
    // ✅ Rescisão ANTES do vencimento: apenas proporcional
    console.log("  🔍 Rescisão ANTES do vencimento - cobra apenas proporcional");
    
    daysUsed = terminationDay;   // Dias do mês corrente (1 até dia da rescisão)
    proportionalRent = (monthlyRent / 30) * daysUsed;
    
    console.log(`  Dias usados: ${daysUsed}`);
    console.log(`  Valor proporcional: R$ ${proportionalRent.toFixed(2)}`);
  }

  // ==========================================
  // PASSO 3: Buscar/criar recebimento do mês
  // ==========================================
  console.log("\n🔍 PASSO 3: Buscar recebimento do mês da rescisão");
  
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

  if (!paymentOfMonth) {
    console.log("  ⚠️ Recebimento não encontrado. Criando novo...");
    
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("*")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      console.error("❌ Erro ao buscar rental:", rentalError);
      throw new Error("Não foi possível buscar dados da locação");
    }

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

    console.log(`  ✅ Recebimento criado: ${newPayment.id}`);
    paymentOfMonth = newPayment;
  } else {
    console.log(`  ✅ Recebimento encontrado: ${paymentOfMonth.id}`);
  }

  // ==========================================
  // PASSO 4: Calcular caução corrigido
  // ==========================================
  console.log("\n💰 PASSO 4: Calcular caução corrigido pelo IGPM");
  
  const rentalStartDate = await supabase
    .from("rentals")
    .select("start_date")
    .eq("id", rentalId)
    .single();

  const startDate = rentalStartDate.data?.start_date || paymentOfMonth.due_date;
  
  const igpmCorrection = calculateCorrectedDeposit(
    depositAmount,
    startDate,
    terminationDate
  );

  const correctedDeposit = igpmCorrection.correctedAmount;

  console.log(`  Valor original: R$ ${depositAmount.toFixed(2)}`);
  console.log(`  Meses ativos: ${igpmCorrection.months}`);
  console.log(`  IGPM acumulado: ${igpmCorrection.poupancaPercentage.toFixed(2)}%`);
  console.log(`  Valor corrigido: R$ ${correctedDeposit.toFixed(2)}`);

  // ==========================================
  // PASSO 5: Criar breakdown
  // ==========================================
  console.log("\n📋 PASSO 5: Criar breakdown (Formação de Valores)");
  
  const breakdown = [];

  if (terminationDay >= paymentDay) {
    // ✅ Rescisão APÓS vencimento: mês cheio + proporcional dias extras
    console.log("  📊 Rescisão APÓS vencimento - criando 2 itens no breakdown");
    console.log(`  - Mês cheio: R$ ${fullMonthRent.toFixed(2)}`);
    console.log(`  - Proporcional (${daysUsed} dias extras): R$ ${proportionalRent.toFixed(2)}`);
    
    breakdown.push({
      description: `Aluguel Cheio (mês ${terminationMonth})`,
      amount: fullMonthRent,
      type: "addition"
    });
    
    breakdown.push({
      description: `Aluguel Proporcional - Dias Extras (${daysUsed} dias - ${paymentDay} a ${terminationDay})`,
      amount: proportionalRent,
      type: "addition"
    });
  } else {
    // ✅ Rescisão ANTES do vencimento: apenas proporcional
    console.log("  📊 Rescisão ANTES do vencimento - criando 1 item no breakdown");
    console.log(`  - Proporcional (${daysUsed} dias): R$ ${proportionalRent.toFixed(2)}`);
    
    breakdown.push({
      description: `Aluguel Proporcional (${daysUsed} dias)`,
      amount: proportionalRent,
      type: "addition"
    });
  }

  if (penaltyAmount > 0) {
    breakdown.push({
      description: "Multa Rescisória",
      amount: penaltyAmount,
      type: "addition"
    });
  }

  if (correctedDeposit > 0) {
    breakdown.push({
      description: "Devolução de Caução (corrigido pela Taxa da Poupança)",
      amount: -correctedDeposit,
      type: "deduction"
    });
  }

  const totalAmount = fullMonthRent + proportionalRent + penaltyAmount - correctedDeposit;

  console.log("  Breakdown criado:");
  breakdown.forEach(item => {
    console.log(`    ${item.type === "addition" ? "+" : "-"} ${item.description}: R$ ${Math.abs(item.amount).toFixed(2)}`);
  });
  console.log(`  Total: R$ ${totalAmount.toFixed(2)}`);

  // ==========================================
  // PASSO 6: Atualizar recebimento do mês
  // ==========================================
  console.log("\n✏️ PASSO 6: Atualizar recebimento do mês");
  
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

  console.log(`  ✅ Recebimento atualizado com sucesso!`);

  // ==========================================
  // PASSO 7: Atualizar data fim do contrato
  // ==========================================
  console.log("\n📅 PASSO 7: Atualizar data fim do contrato");
  
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

  console.log(`  ✅ Data fim atualizada para: ${terminationDate}`);

  // ==========================================
  // PASSO 8: DELETAR pagamentos futuros
  // ==========================================
  console.log("\n🗑️ PASSO 8: DELETAR pagamentos futuros (versão CORRIGIDA)");
  
  // ANTES DE DELETAR: Buscar TODOS os pagamentos para ver o estado atual
  console.log("\n  📊 ESTADO ATUAL (ANTES DA DELEÇÃO):");
  const { data: allPaymentsBefore, error: allBeforeError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status, installment, total_installments")
    .eq("rental_id", rentalId)
    .order("due_date", { ascending: true });

  if (!allBeforeError && allPaymentsBefore) {
    console.log(`  Total de pagamentos NO BANCO: ${allPaymentsBefore.length}`);
    allPaymentsBefore.forEach((p, idx) => {
      console.log(`    ${idx + 1}. Due: ${p.due_date} | Ref: ${p.reference_month}/${p.reference_year} | Status: ${p.status} | Parcela: ${p.installment}/${p.total_installments}`);
    });
  }

  // Calcular qual é o próximo mês após a rescisão
  const nextMonth = terminationMonth === 12 ? 1 : terminationMonth + 1;
  const nextYear = terminationMonth === 12 ? terminationYear + 1 : terminationYear;

  console.log(`\n  🎯 CRITÉRIO DE DELEÇÃO: Pagamentos a partir de ${nextMonth}/${nextYear}`);

  // NOVA ABORDAGEM: Buscar pela data de vencimento (mais confiável que reference_month/year)
  const cutoffDate = new Date(terminationYear, terminationMonth, 1); // Primeiro dia do mês seguinte
  const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

  console.log(`  📅 Data de corte: ${cutoffDateStr}`);

  const { data: paymentsToDelete, error: fetchDeleteError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status")
    .eq("rental_id", rentalId)
    .gte("due_date", cutoffDateStr); // Pagamentos com vencimento >= primeiro dia do próximo mês

  if (fetchDeleteError) {
    console.error("❌ Erro ao buscar pagamentos para deletar:", fetchDeleteError);
    throw fetchDeleteError;
  }

  console.log(`\n  📋 PAGAMENTOS ENCONTRADOS PARA DELETAR: ${paymentsToDelete?.length || 0}`);
  
  if (paymentsToDelete && paymentsToDelete.length > 0) {
    paymentsToDelete.forEach((p, idx) => {
      console.log(`    ${idx + 1}. Due: ${p.due_date} | Ref: ${p.reference_month}/${p.reference_year} | Status: ${p.status}`);
    });

    const idsToDelete = paymentsToDelete.map(p => p.id);
    
    console.log(`\n  🔥 EXECUTANDO DELEÇÃO de ${idsToDelete.length} pagamentos...`);

    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("❌ Erro ao deletar recebimentos:", deleteError);
      throw deleteError;
    }

    console.log(`  ✅ ${paymentsToDelete.length} pagamentos deletados com SUCESSO!`);
  } else {
    console.log("  ℹ️ Nenhum pagamento encontrado para deletar");
  }

  // VERIFICAÇÃO: Buscar novamente para confirmar deleção
  console.log("\n  🔍 VERIFICAÇÃO: Buscando pagamentos após deleção...");
  const { data: allPaymentsAfterDelete, error: allAfterDeleteError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status")
    .eq("rental_id", rentalId)
    .order("due_date", { ascending: true });

  if (!allAfterDeleteError && allPaymentsAfterDelete) {
    console.log(`  📊 Total de pagamentos APÓS DELEÇÃO: ${allPaymentsAfterDelete.length}`);
    allPaymentsAfterDelete.forEach((p, idx) => {
      console.log(`    ${idx + 1}. Due: ${p.due_date} | Ref: ${p.reference_month}/${p.reference_year} | Status: ${p.status}`);
    });
  }

  // ==========================================
  // PASSO 9: RECALCULAR números de parcelas
  // ==========================================
  console.log("\n🔢 PASSO 9: RECALCULAR números de parcelas (DEFINITIVO)");
  console.log(`  Rental ID: ${rentalId}`);

  // Buscar TODOS os pagamentos restantes
  const { data: remainingPayments, error: remainingError } = await supabase
    .from("payments")
    .select("id, due_date, installment, total_installments")
    .eq("rental_id", rentalId)
    .order("due_date", { ascending: true });

  if (remainingError) {
    console.error("❌ Erro ao buscar pagamentos restantes:", remainingError);
    throw remainingError;
  }

  if (!remainingPayments || remainingPayments.length === 0) {
    console.log("  ⚠️ ERRO: Nenhum pagamento encontrado após deleção!");
    throw new Error("Nenhum pagamento encontrado após deleção");
  }

  const newTotalInstallments = remainingPayments.length;
  console.log(`  📊 Total de parcelas CORRETO: ${newTotalInstallments}`);

  console.log("\n  📋 VALORES ANTES DO RECÁLCULO:");
  remainingPayments.forEach((p, idx) => {
    console.log(`    ${idx + 1}. ID: ${p.id.substring(0, 8)}... | Due: ${p.due_date} | installment=${p.installment || 'null'} | total_installments=${p.total_installments || 'null'}`);
  });

  // ATUALIZAR TODOS DE UMA VEZ (mais eficiente)
  console.log(`\n  🔄 ATUALIZANDO ${newTotalInstallments} pagamentos...`);
  
  for (let i = 0; i < remainingPayments.length; i++) {
    const newInstallmentNumber = i + 1;
    const payment = remainingPayments[i];

    const { error: updateInstallmentError } = await supabase
      .from("payments")
      .update({
        installment: newInstallmentNumber,
        total_installments: newTotalInstallments
      })
      .eq("id", payment.id);

    if (updateInstallmentError) {
      console.error(`  ❌ Erro ao atualizar parcela ${newInstallmentNumber}:`, updateInstallmentError);
      throw updateInstallmentError;
    }

    console.log(`    ✅ Parcela ${newInstallmentNumber}/${newTotalInstallments} atualizada (ID: ${payment.id.substring(0, 8)}...)`);
  }

  console.log(`  ✅ Todos os ${newTotalInstallments} pagamentos atualizados!`);

  // ==========================================
  // PASSO 10: VERIFICAÇÃO FINAL
  // ==========================================
  console.log("\n✅ PASSO 10: VERIFICAÇÃO FINAL");
  
  const { data: finalPayments, error: finalError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status, installment, total_installments")
    .eq("rental_id", rentalId)
    .order("due_date", { ascending: true });

  if (finalError) {
    console.error("❌ Erro na verificação final:", finalError);
    throw finalError;
  }

  if (!finalPayments) {
    console.log("  ⚠️ Nenhum pagamento encontrado na verificação final!");
    throw new Error("Nenhum pagamento encontrado na verificação final");
  }

  console.log(`  📊 ESTADO FINAL (APÓS RECÁLCULO):`);
  console.log(`  Total de pagamentos: ${finalPayments.length}`);
  
  let hasError = false;
  finalPayments.forEach((p, idx) => {
    const isCorrect = p.installment === (idx + 1) && p.total_installments === finalPayments.length;
    const status = isCorrect ? "✅" : "❌ ERRO!";
    console.log(`    ${idx + 1}. ${status} Due: ${p.due_date} | Ref: ${p.reference_month}/${p.reference_year} | Parcela: ${p.installment}/${p.total_installments}`);
    if (!isCorrect) hasError = true;
  });

  if (hasError) {
    console.error("\n  ❌ ERRO: Alguns pagamentos não foram atualizados corretamente!");
    throw new Error("Erro ao recalcular parcelas - verificação falhou");
  }

  console.log("\n  ✅ VERIFICAÇÃO FINAL: Todos os números de parcelas estão CORRETOS!");

  // ==========================================
  // RESUMO FINAL
  // ==========================================
  console.log("\n" + "═".repeat(80));
  console.log("🎉 RESUMO DA RESCISÃO");
  console.log("═".repeat(80));
  console.log(`✅ Recebimento de ${terminationMonth}/${terminationYear} atualizado: R$ ${totalAmount.toFixed(2)}`);
  console.log(`✅ Pagamentos deletados: ${paymentsToDelete?.length || 0} (a partir de ${nextMonth}/${nextYear})`);
  console.log(`✅ Total de parcelas recalculado: ${newTotalInstallments}`);
  console.log(`✅ Data fim do contrato: ${terminationDate}`);
  console.log(`⚠️ Status NÃO alterado: Locação, imóvel e inquilino permanecem ativos até o pagamento`);
  console.log(`💡 Despesas de reforma podem ser adicionadas depois na tela de Recebimentos`);
  console.log("═".repeat(80));
  console.log("🏁 FIM processContractTermination");
  console.log("═".repeat(80) + "\n");
}