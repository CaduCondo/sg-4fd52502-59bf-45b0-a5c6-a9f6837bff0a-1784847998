import { supabase } from "@/integrations/supabase/client";
import { generateExpectedPayments } from "./paymentService";

/**
 * Verifica TODAS as locações ativas e cria recebimentos faltantes
 * Retorna relatório detalhado do que foi feito
 */
export async function verifyAndCreateMissingPayments(): Promise<{
  success: boolean;
  message: string;
  details: {
    rentalsChecked: number;
    paymentsCreated: number;
    errors: string[];
    rentalsFixed: Array<{
      rentalId: string;
      property: string;
      tenant: string;
      missing: number;
      created: number;
    }>;
  };
}> {
  const details = {
    rentalsChecked: 0,
    paymentsCreated: 0,
    errors: [] as string[],
    rentalsFixed: [] as Array<{
      rentalId: string;
      property: string;
      tenant: string;
      missing: number;
      created: number;
    }>,
  };

  try {
    console.log("🔍 [verifyAndCreateMissingPayments] Buscando locações ativas...");

    // Buscar TODAS as locações ativas
    const { data: rentals, error: rentalsError } = await supabase
      .from("rentals")
      .select(`
        id,
        start_date,
        end_date,
        rent_value,
        rent_due_day,
        has_garage,
        garage_value,
        status,
        properties!rentals_property_id_fkey(id, complement),
        tenants!rentals_tenant_id_fkey(id, name)
      `)
      .eq("status", "active");

    if (rentalsError) {
      throw new Error(`Erro ao buscar locações: ${rentalsError.message}`);
    }

    if (!rentals || rentals.length === 0) {
      return {
        success: true,
        message: "Nenhuma locação ativa encontrada",
        details,
      };
    }

    console.log(`📊 [verifyAndCreateMissingPayments] ${rentals.length} locações ativas encontradas`);
    details.rentalsChecked = rentals.length;

    // Processar cada locação
    for (const rental of rentals) {
      try {
        const property = Array.isArray(rental.properties) ? rental.properties[0] : rental.properties;
        const tenant = Array.isArray(rental.tenants) ? rental.tenants[0] : rental.tenants;
        
        const propertyName = property?.complement || "Sem nome";
        const tenantName = tenant?.name || "Sem nome";

        console.log(`🔄 [verifyAndCreateMissingPayments] Processando: ${propertyName} - ${tenantName}`);

        // Gerar recebimentos esperados
        const expectedPayments = generateExpectedPayments({
          rentalId: rental.id,
          startDate: rental.start_date,
          endDate: rental.end_date,
          monthlyRent: rental.rent_value || 0,
          paymentDay: rental.rent_due_day || 5,
          hasGarage: rental.has_garage || false,
          garageValue: rental.garage_value || 0,
        });

        // Buscar recebimentos existentes
        const { data: existingPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("id, reference_month, reference_year")
          .eq("rental_id", rental.id);

        if (paymentsError) {
          details.errors.push(`${propertyName}: ${paymentsError.message}`);
          continue;
        }

        // Criar Set de referências existentes (formato normalizado com padding)
        const existingRefs = new Set(
          (existingPayments || []).map((p) => {
            const month = String(p.reference_month).padStart(2, '0');
            const year = String(p.reference_year);
            return `${year}-${month}`;
          })
        );

        // Filtrar apenas os recebimentos que estão faltando
        const paymentsToCreate = expectedPayments.filter((exp) => {
          const expMonth = String(exp.reference_month).padStart(2, '0');
          const expYear = String(exp.reference_year);
          const ref = `${expYear}-${expMonth}`;
          return !existingRefs.has(ref);
        });

        if (paymentsToCreate.length === 0) {
          console.log(`✅ ${propertyName}: Todos os recebimentos já existem`);
          continue;
        }

        console.log(`➕ ${propertyName}: ${paymentsToCreate.length} recebimentos faltando`);

        // Inserir recebimentos faltantes
        const { data: insertedData, error: insertError } = await supabase
          .from("payments")
          .insert(paymentsToCreate)
          .select("id");

        if (insertError) {
          details.errors.push(`${propertyName}: ${insertError.message}`);
          continue;
        }

        const createdCount = insertedData?.length || 0;
        details.paymentsCreated += createdCount;

        details.rentalsFixed.push({
          rentalId: rental.id,
          property: propertyName,
          tenant: tenantName,
          missing: paymentsToCreate.length,
          created: createdCount,
        });

        console.log(`✅ ${propertyName}: ${createdCount} recebimentos criados`);

      } catch (rentalError: any) {
        const property = Array.isArray(rental.properties) ? rental.properties[0] : rental.properties;
        const propertyName = property?.complement || rental.id;
        details.errors.push(`${propertyName}: ${rentalError.message}`);
        console.error(`❌ Erro ao processar ${propertyName}:`, rentalError);
      }
    }

    const hasErrors = details.errors.length > 0;
    const message = hasErrors
      ? `Processo concluído com ${details.errors.length} erro(s). ${details.paymentsCreated} recebimentos criados em ${details.rentalsFixed.length} locações.`
      : `Processo concluído com sucesso! ${details.paymentsCreated} recebimentos criados em ${details.rentalsFixed.length} locações.`;

    return {
      success: !hasErrors,
      message,
      details,
    };
  } catch (error: any) {
    console.error("❌ [verifyAndCreateMissingPayments] Erro crítico:", error);
    return {
      success: false,
      message: `Erro crítico: ${error.message}`,
      details,
    };
  }
}