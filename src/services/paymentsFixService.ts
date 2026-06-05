import { supabase } from "@/integrations/supabase/client";
import { createPaymentsForRental } from "./paymentService";
import { Rental } from "@/types";

/**
 * Verifica e corrige recebimentos para TODOS os contratos vigentes
 */
export async function verifyAndFixAllRentalsPayments(): Promise<{
  success: boolean;
  message: string;
  details: {
    totalRentals: number;
    rentalsChecked: number;
    rentalsWithMissingPayments: number;
    paymentsCreated: number;
    errors: string[];
  };
}> {
  const details = {
    totalRentals: 0,
    rentalsChecked: 0,
    rentalsWithMissingPayments: 0,
    paymentsCreated: 0,
    errors: [] as string[],
  };

  try {
    console.log("🔍 [verifyAndFixAllRentalsPayments] Iniciando verificação de TODOS os contratos...");

    // 1. Buscar TODOS os contratos ativos
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("id, property_id, tenant_id, start_date, end_date, rent_value, rent_due_day, has_garage, garage_value")
      .eq("status", "active")
      .not("start_date", "is", null)
      .not("end_date", "is", null);

    if (rentalsError) {
      throw new Error(`Erro ao buscar contratos: ${rentalsError.message}`);
    }

    if (!rentals || rentals.length === 0) {
      return {
        success: true,
        message: "Nenhum contrato ativo encontrado",
        details,
      };
    }

    details.totalRentals = rentals.length;
    console.log(`📋 [verifyAndFixAllRentalsPayments] ${rentals.length} contratos ativos encontrados`);

    // 2. Para cada contrato, verificar e criar recebimentos faltantes
    for (const rental of rentals) {
      details.rentalsChecked++;
      
      console.log(`\n🔍 [verifyAndFixAllRentalsPayments] Verificando contrato ${rental.id}...`);
      console.log(`   Período: ${rental.start_date} a ${rental.end_date}`);
      console.log(`   Valor: R$ ${rental.rent_value} | Dia vencimento: ${rental.rent_due_day}`);

      try {
        // Calcular quantos recebimentos DEVERIAM existir
        const startDate = new Date(rental.start_date);
        const endDate = new Date(rental.end_date);
        
        let expectedPayments = 0;
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          expectedPayments++;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        console.log(`   📊 Recebimentos esperados: ${expectedPayments}`);

        // Verificar quantos recebimentos JÁ EXISTEM
        const { count: existingCount, error: countError } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("rental_id", rental.id);

        if (countError) {
          details.errors.push(`Erro ao contar recebimentos do contrato ${rental.id}: ${countError.message}`);
          console.error(`   ❌ Erro ao contar recebimentos:`, countError);
          continue;
        }

        console.log(`   📊 Recebimentos existentes: ${existingCount || 0}`);

        // Se faltarem recebimentos, criar
        if ((existingCount || 0) < expectedPayments) {
          details.rentalsWithMissingPayments++;
          const missing = expectedPayments - (existingCount || 0);
          
          console.log(`   ⚠️ FALTAM ${missing} recebimentos! Criando...`);

          try {
            await createPaymentsForRental({
              rental: { id: rental.id } as Rental,
              startDate: new Date(rental.start_date),
              endDate: new Date(rental.end_date),
              monthlyRent: rental.rent_value,
              paymentDay: rental.rent_due_day,
              hasGarage: rental.has_garage || false,
              garageValue: rental.garage_value || 0,
            });

            // Contar quantos foram realmente criados
            const { count: newCount } = await supabase
              .from("payments")
              .select("*", { count: "exact", head: true })
              .eq("rental_id", rental.id);

            const created = (newCount || 0) - (existingCount || 0);
            details.paymentsCreated += created;

            console.log(`   ✅ ${created} recebimentos criados com sucesso!`);
          } catch (createError: any) {
            details.errors.push(`Erro ao criar recebimentos do contrato ${rental.id}: ${createError.message}`);
            console.error(`   ❌ Erro ao criar recebimentos:`, createError);
          }
        } else {
          console.log(`   ✅ Contrato OK - todos os recebimentos existem`);
        }
      } catch (error: any) {
        details.errors.push(`Erro ao processar contrato ${rental.id}: ${error.message}`);
        console.error(`   ❌ Erro ao processar contrato:`, error);
      }
    }

    console.log(`\n✅ [verifyAndFixAllRentalsPayments] Verificação concluída!`);
    console.log(`📊 Resumo:`);
    console.log(`   - Total de contratos: ${details.totalRentals}`);
    console.log(`   - Contratos verificados: ${details.rentalsChecked}`);
    console.log(`   - Contratos com recebimentos faltantes: ${details.rentalsWithMissingPayments}`);
    console.log(`   - Recebimentos criados: ${details.paymentsCreated}`);
    console.log(`   - Erros: ${details.errors.length}`);

    return {
      success: true,
      message: `Verificação concluída: ${details.paymentsCreated} recebimentos criados`,
      details,
    };
  } catch (error: any) {
    console.error("❌ [verifyAndFixAllRentalsPayments] Erro crítico:", error);
    return {
      success: false,
      message: `Erro crítico: ${error.message}`,
      details,
    };
  }
}