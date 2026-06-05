import { supabase } from "@/integrations/supabase/client";
import { createPaymentsForRental } from "./paymentService";
import { Rental } from "@/types";

/**
 * Força a criação de recebimentos para uma locação específica
 * Busca pela propriedade e inquilino, deleta recebimentos existentes e recria todos
 */
export async function forceCreatePaymentsForSpecificRental(
  propertyName: string,
  tenantName: string
): Promise<{
  success: boolean;
  message: string;
  details: {
    rentalId: string | null;
    paymentsDeleted: number;
    paymentsCreated: number;
  };
}> {
  const details = {
    rentalId: null as string | null,
    paymentsDeleted: 0,
    paymentsCreated: 0,
  };

  try {
    console.log(`🔍 [forceCreatePayments] Buscando locação para propriedade "${propertyName}" e inquilino "${tenantName}"...`);

    // 1. Buscar a propriedade pelo complemento
    const { data: properties, error: propertyError } = await supabase
      .from("properties")
      .select("id, complement, locations!properties_location_id_fkey(name, street)")
      .ilike("complement", `%${propertyName}%`);

    if (propertyError) {
      throw new Error(`Erro ao buscar propriedade: ${propertyError.message}`);
    }

    if (!properties || properties.length === 0) {
      throw new Error(`Propriedade "${propertyName}" não encontrada`);
    }

    const propertyId = properties[0].id;
    console.log(`✅ Propriedade encontrada: ${propertyId}`);

    // 2. Buscar o inquilino pelo nome
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name")
      .ilike("name", `%${tenantName}%`);

    if (tenantError) {
      throw new Error(`Erro ao buscar inquilino: ${tenantError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      throw new Error(`Inquilino "${tenantName}" não encontrado`);
    }

    const tenantId = tenants[0].id;
    console.log(`✅ Inquilino encontrado: ${tenantId} - ${tenants[0].name}`);

    // 3. Buscar a locação ativa para essa propriedade e inquilino
    const { data: rentals, error: rentalError } = await supabase
      .from("rentals")
      .select("*")
      .eq("property_id", propertyId)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (rentalError) {
      throw new Error(`Erro ao buscar locação: ${rentalError.message}`);
    }

    if (!rentals || rentals.length === 0) {
      throw new Error(`Locação ativa não encontrada para propriedade "${propertyName}" e inquilino "${tenantName}"`);
    }

    const rental = rentals[0];
    details.rentalId = rental.id;

    console.log(`✅ Locação encontrada: ${rental.id}`);
    console.log(`   Período: ${rental.start_date} a ${rental.end_date}`);
    console.log(`   Valor: R$ ${rental.rent_value} | Dia vencimento: ${rental.rent_due_day}`);

    // 4. DELETAR todos os recebimentos existentes dessa locação
    const { data: deletedPayments, error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("rental_id", rental.id)
      .select();

    if (deleteError) {
      throw new Error(`Erro ao deletar recebimentos existentes: ${deleteError.message}`);
    }

    details.paymentsDeleted = deletedPayments?.length || 0;
    console.log(`🗑️ ${details.paymentsDeleted} recebimentos existentes deletados`);

    // 5. CRIAR todos os recebimentos novamente
    console.log(`🔧 Criando TODOS os recebimentos do zero...`);

    await createPaymentsForRental({
      rental: { id: rental.id } as Rental,
      startDate: new Date(rental.start_date),
      endDate: new Date(rental.end_date),
      monthlyRent: rental.rent_value,
      paymentDay: rental.rent_due_day,
      hasGarage: rental.has_garage || false,
      garageValue: rental.garage_value || 0,
    });

    // 6. Contar quantos foram criados
    const { count: newCount, error: countError } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("rental_id", rental.id);

    if (countError) {
      throw new Error(`Erro ao contar recebimentos criados: ${countError.message}`);
    }

    details.paymentsCreated = newCount || 0;

    console.log(`✅ ${details.paymentsCreated} recebimentos criados com sucesso!`);

    return {
      success: true,
      message: `${details.paymentsCreated} recebimentos criados para a locação ${rental.id}`,
      details,
    };
  } catch (error: any) {
    console.error("❌ [forceCreatePayments] Erro crítico:", error);
    return {
      success: false,
      message: `Erro: ${error.message}`,
      details,
    };
  }
}

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