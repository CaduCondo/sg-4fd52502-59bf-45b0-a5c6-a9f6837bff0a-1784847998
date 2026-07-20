import { supabase } from "@/integrations/supabase/client";
import { createDepositInstallments } from "./depositInstallmentService";

/**
 * Gera parcelas de caução para locações existentes que não têm
 * Esta função deve ser executada uma única vez para migrar dados antigos
 */
export async function generateMissingDepositInstallments(): Promise<{
  success: number;
  errors: number;
  total: number;
}> {
  console.log("🔄 [generateMissingDepositInstallments] Iniciando geração de parcelas de caução...");
  
  let success = 0;
  let errors = 0;
  
  try {
    // 1. Buscar todas as locações
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("*");

    if (rentalsError) {
      console.error("❌ Erro ao buscar locações:", rentalsError);
      throw rentalsError;
    }

    console.log(`📋 Total de locações encontradas: ${rentals?.length || 0}`);

    if (!rentals || rentals.length === 0) {
      return { success: 0, errors: 0, total: 0 };
    }

    // 2. Para cada locação, verificar se já tem parcelas
    for (const rental of rentals) {
      try {
        // Verificar se já tem parcelas na tabela deposit_installments
        const { data: existingInstallments, error: checkError } = await supabase
          .from("deposit_installments")
          .select("id")
          .eq("rental_id", rental.id);

        if (checkError) {
          console.error(`❌ Erro ao verificar parcelas da locação ${rental.id}:`, checkError);
          errors++;
          continue;
        }

        // Se já tem parcelas, pular
        if (existingInstallments && existingInstallments.length > 0) {
          console.log(`⏭️ Locação ${rental.id} já possui ${existingInstallments.length} parcela(s)`);
          continue;
        }

        // Se não tem deposit_value, pular
        if (!rental.deposit_value || rental.deposit_value <= 0) {
          console.log(`⏭️ Locação ${rental.id} não possui caução`);
          continue;
        }

        console.log(`🔄 Gerando parcelas para locação ${rental.id}...`);

        const installmentsToCreate = [];
        const totalInstallments = rental.deposit_installments || 1;

        // 1ª Parcela (obrigatória)
        installmentsToCreate.push({
          installment_number: 1,
          total_installments: totalInstallments,
          amount: rental.deposit_value,
          due_date: rental.start_date, // Usa data de início como data de vencimento padrão
          payment_date: null,
          pix_code: rental.pix_code || null,
        });

        // 2ª e 3ª parcelas (se houver)
        // Como não temos dados históricos completos, criamos apenas a 1ª parcela
        // Se rental.deposit_installments > 1, seria necessário ter mais dados

        console.log(`📦 Criando ${installmentsToCreate.length} parcela(s) para locação ${rental.id}`);

        await createDepositInstallments(rental.id, installmentsToCreate);

        console.log(`✅ Parcelas criadas com sucesso para locação ${rental.id}`);
        success++;
      } catch (rentalError) {
        console.error(`❌ Erro ao processar locação ${rental.id}:`, rentalError);
        errors++;
      }
    }

    console.log(`✅ [generateMissingDepositInstallments] Concluído!`);
    console.log(`   - Sucesso: ${success}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`   - Total: ${rentals.length}`);

    return {
      success,
      errors,
      total: rentals.length,
    };
  } catch (error) {
    console.error("❌ [generateMissingDepositInstallments] Erro fatal:", error);
    throw error;
  }
}