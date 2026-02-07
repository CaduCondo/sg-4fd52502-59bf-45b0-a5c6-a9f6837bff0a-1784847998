import { supabase } from "@/integrations/supabase/client";
import { parseISO, addMonths, format, getMonth, getYear } from "date-fns";

export interface TerminationData {
  rentalId: string;
  terminationDate: string;
  penaltyAmount: number;
  paymentDay: number;
  depositAmount?: number;
  repairExpenses?: number;
}

/**
 * Processa a rescisão de contrato:
 * 1. Mantém recebimentos ATÉ o mês da rescisão (inclusive)
 * 2. Deleta recebimentos POSTERIORES ao mês da rescisão
 * 3. Cria 1 recebimento final com: Multa - Caução Total + Despesas
 * 4. NÃO atualiza status (só muda quando o recebimento final for pago)
 */
export async function processContractTermination(data: TerminationData): Promise<void> {
  console.log("=== INICIO processContractTermination ===");
  console.log("Dados recebidos:", data);

  const { rentalId, terminationDate, penaltyAmount, paymentDay, depositAmount = 0, repairExpenses = 0 } = data;

  // PASSO 1: Determinar o mês da rescisão e o mês do recebimento final
  const terminationDateObj = parseISO(terminationDate);
  const terminationMonth = getMonth(terminationDateObj) + 1; // 1-12
  const terminationYear = getYear(terminationDateObj);
  
  // O recebimento final será no MÊS SEGUINTE ao mês da rescisão
  const nextMonth = addMonths(terminationDateObj, 1);
  const finalPaymentMonth = getMonth(nextMonth) + 1; // 1-12
  const finalPaymentYear = getYear(nextMonth);

  console.log("📅 Data de rescisão:", format(terminationDateObj, "dd/MM/yyyy"));
  console.log("📅 Mês da rescisão:", `${terminationMonth}/${terminationYear}`);
  console.log("📅 Mês do recebimento final:", `${finalPaymentMonth}/${finalPaymentYear}`);

  // PASSO 2: Criar data de vencimento do recebimento final
  // Vencimento = dia do pagamento no mês seguinte ao da rescisão
  let finalPaymentDueDate = new Date(finalPaymentYear, finalPaymentMonth - 1, paymentDay);

  // Ajuste para dias inexistentes (ex: 31 de fev vira último dia do mês)
  if (finalPaymentDueDate.getMonth() !== finalPaymentMonth - 1) {
    finalPaymentDueDate = new Date(finalPaymentYear, finalPaymentMonth, 0); // Último dia do mês
    console.log("⚠️ Dia inexistente ajustado para:", format(finalPaymentDueDate, "dd/MM/yyyy"));
  }

  const dueDateStr = format(finalPaymentDueDate, "yyyy-MM-dd");
  console.log("💰 Vencimento do recebimento final:", format(finalPaymentDueDate, "dd/MM/yyyy"));

  // PASSO 3: Deletar APENAS os recebimentos POSTERIORES ao mês da rescisão
  console.log("\n🗑️ Deletando recebimentos POSTERIORES a", `${terminationMonth}/${terminationYear}...`);

  const { data: paymentsToDelete, error: fetchError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status")
    .eq("rental_id", rentalId)
    .order("due_date", { ascending: true });

  if (fetchError) {
    console.error("❌ Erro ao buscar recebimentos para deletar:", fetchError);
    throw fetchError;
  }

  // Filtrar APENAS recebimentos POSTERIORES ao mês da rescisão
  const toDelete = paymentsToDelete?.filter(p => {
    const refYear = parseInt(p.reference_year);
    const refMonth = parseInt(p.reference_month);
    
    // Deletar se: ano > ano da rescisão OU (mesmo ano E mês > mês da rescisão)
    return refYear > terminationYear || (refYear === terminationYear && refMonth > terminationMonth);
  }) || [];

  console.log(`📋 Encontrados ${toDelete.length} recebimentos para deletar`);

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(p => p.id);
    
    console.log("IDs a deletar:", idsToDelete);
    toDelete.forEach(p => {
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

    console.log(`✅ Deletados ${toDelete.length} recebimentos`);
  } else {
    console.log("✅ Nenhum recebimento para deletar (todos estão no período mantido)");
  }

  // PASSO 4: Criar recebimento final (rescisão)
  // Cálculo: Multa - Caução Total + Despesas de Reparos = Valor Final
  const finalAmount = Math.max(0, penaltyAmount - depositAmount + repairExpenses);
  
  const notes = `Rescisão de Contrato
--------------------------------
Multa Rescisória: R$ ${penaltyAmount.toFixed(2)}
(-) Devolução Caução: R$ ${depositAmount.toFixed(2)}
(+) Despesas Reparos: R$ ${repairExpenses.toFixed(2)}
--------------------------------
Total a Receber: R$ ${finalAmount.toFixed(2)}`;

  console.log("\n💰 Criando recebimento final (rescisão)...");
  console.log("   Valor Final:", `R$ ${finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log("   Vencimento:", format(finalPaymentDueDate, "dd/MM/yyyy"));
  console.log("   Referência:", `${finalPaymentMonth}/${finalPaymentYear}`);
  console.log("   Descrição:");
  console.log(notes);

  const { data: newPayment, error: insertError } = await supabase
    .from("payments")
    .insert({
      rental_id: rentalId,
      due_date: dueDateStr,
      expected_amount: finalAmount,
      status: "pending",
      reference_month: String(finalPaymentMonth),
      reference_year: String(finalPaymentYear),
      notes: notes,
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Erro ao criar recebimento final:", insertError);
    throw insertError;
  }

  console.log("✅ Recebimento final criado:", newPayment.id);

  console.log("\n=== RESUMO DA RESCISÃO ===");
  console.log(`✅ Recebimentos mantidos: Até ${terminationMonth}/${terminationYear} (inclusive)`);
  console.log(`✅ Recebimentos deletados: ${toDelete.length} (posteriores a ${terminationMonth}/${terminationYear})`);
  console.log(`✅ Recebimento final: Criado para ${finalPaymentMonth}/${finalPaymentYear} (R$ ${finalAmount.toFixed(2)})`);
  console.log(`⚠️  Status NÃO alterado: Locação, imóvel e inquilino permanecem ativos até o pagamento final`);
  console.log("=== FIM processContractTermination ===");
}