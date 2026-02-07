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
 * 1. Cria recebimento de rescisão no mês POSTERIOR à data de rescisão
 * 2. Deleta todos os recebimentos do mês posterior em diante
 * 3. Mantém recebimentos até o mês da rescisão
 */
export async function processContractTermination(data: TerminationData): Promise<void> {
  console.log("=== INICIO processContractTermination ===");
  console.log("Dados recebidos:", data);

  const { rentalId, terminationDate, penaltyAmount, paymentDay, depositAmount = 0, repairExpenses = 0 } = data;

  // PASSO 1: Calcular o mês posterior à rescisão
  const terminationDateObj = parseISO(terminationDate);
  const nextMonth = addMonths(terminationDateObj, 1);
  const nextMonthNumber = getMonth(nextMonth) + 1; // 1-12
  const nextMonthYear = getYear(nextMonth);
  const currentMonthNumber = getMonth(terminationDateObj) + 1;
  const currentMonthYear = getYear(terminationDateObj);

  console.log("📅 Data de rescisão:", format(terminationDateObj, "dd/MM/yyyy"));
  console.log("📅 Mês posterior (recebimento):", `${nextMonthNumber}/${nextMonthYear}`);

  // PASSO 2: Criar data de vencimento do recebimento de rescisão
  // Vencimento = dia do pagamento no mês posterior
  let terminationPaymentDueDate = new Date(nextMonthYear, nextMonthNumber - 1, paymentDay);

  // Ajuste para dias inexistentes (ex: 31 de fev vira último dia do mês)
  if (terminationPaymentDueDate.getMonth() !== nextMonthNumber - 1) {
    terminationPaymentDueDate = new Date(nextMonthYear, nextMonthNumber, 0); // Último dia do mês
    console.log("⚠️ Dia inexistente ajustado para:", format(terminationPaymentDueDate, "dd/MM/yyyy"));
  }

  const dueDateStr = format(terminationPaymentDueDate, "yyyy-MM-dd");
  console.log("💰 Vencimento do recebimento de rescisão:", format(terminationPaymentDueDate, "dd/MM/yyyy"));

  // PASSO 3: Deletar TODOS os recebimentos do mês posterior em diante
  console.log("\n🗑️ Deletando recebimentos do mês", `${nextMonthNumber}/${nextMonthYear}`, "em diante...");

  const { data: paymentsToDelete, error: fetchError } = await supabase
    .from("payments")
    .select("id, due_date, reference_month, reference_year, status")
    .eq("rental_id", rentalId)
    .gte("reference_year", currentMonthYear) // Busca do ano atual em diante
    .order("due_date", { ascending: true });

  if (fetchError) {
    console.error("❌ Erro ao buscar recebimentos para deletar:", fetchError);
    throw fetchError;
  }

  // Filtrar recebimentos do mês posterior em diante
  const toDelete = paymentsToDelete?.filter(p => {
    const refYear = parseInt(p.reference_year);
    const refMonth = parseInt(p.reference_month);
    
    // Deletar se: ano > próximo ano OU (mesmo ano E mês >= próximo mês)
    return refYear > nextMonthYear || (refYear === nextMonthYear && refMonth >= nextMonthNumber);
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
  }

  // PASSO 4: Criar recebimento de rescisão
  // Cálculo: Multa - Caução + Reparos = Valor Final
  // Se o valor for negativo (Caução > Multa + Reparos), cria recebimento zerado ou com valor simbólico e nota explicativa
  
  const finalAmount = Math.max(0, penaltyAmount - depositAmount + repairExpenses);
  const notes = `Rescisão de Contrato
--------------------------------
Multa Rescisória: R$ ${penaltyAmount.toFixed(2)}
(-) Devolução Caução: R$ ${depositAmount.toFixed(2)}
(+) Despesas Reparos: R$ ${repairExpenses.toFixed(2)}
--------------------------------
Total a Receber: R$ ${finalAmount.toFixed(2)}`;

  console.log("\n💰 Criando recebimento de rescisão...");
  console.log("   Valor Final:", `R$ ${finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log("   Vencimento:", format(terminationPaymentDueDate, "dd/MM/yyyy"));
  console.log("   Referência:", `${nextMonthNumber}/${nextMonthYear}`);

  const { data: newPayment, error: insertError } = await supabase
    .from("payments")
    .insert({
      rental_id: rentalId,
      due_date: dueDateStr,
      expected_amount: finalAmount,
      status: "pending",
      reference_month: String(nextMonthNumber),
      reference_year: String(nextMonthYear),
      notes: notes,
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Erro ao criar recebimento de rescisão:", insertError);
    throw insertError;
  }

  console.log("✅ Recebimento de rescisão criado:", newPayment.id);

  console.log("\n=== RESUMO DA RESCISÃO ===");
  console.log(`✅ Recebimentos deletados: ${toDelete.length}`);
  console.log(`✅ Recebimento de rescisão: Criado (${notes.replace(/\n/g, ", ")})`);
  console.log("=== FIM processContractTermination ===");
}