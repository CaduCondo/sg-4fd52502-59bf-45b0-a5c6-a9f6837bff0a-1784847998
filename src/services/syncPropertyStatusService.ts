import { supabase } from "@/integrations/supabase/client";

/**
 * Sincroniza o status de TODOS os imóveis baseado nas locações ativas
 * 
 * Regras:
 * - Se o imóvel tem locação ATIVA → status = "occupied"
 * - Se o imóvel NÃO tem locação ativa → status = "available"
 * - Mantém status "unavailable" se definido manualmente
 * 
 * @returns Objeto com contagens de imóveis atualizados
 */
export async function syncAllPropertyStatuses(): Promise<{
  total: number;
  updated: number;
  errors: number;
  details: {
    nowOccupied: number;
    nowAvailable: number;
    keptUnavailable: number;
  };
}> {
  console.log("🔄 [syncPropertyStatus] Iniciando sincronização de status de imóveis...");

  try {
    // 1. Buscar TODOS os imóveis
    const { data: properties, error: propsError } = await supabase
      .from("properties")
      .select("id, status");

    if (propsError) throw propsError;

    console.log(`📊 [syncPropertyStatus] ${properties?.length || 0} imóveis encontrados`);

    // 2. Buscar TODAS as locações ATIVAS
    const { data: activeRentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("property_id")
      .eq("status", "active");

    if (rentalsError) throw rentalsError;

    console.log(`📊 [syncPropertyStatus] ${activeRentals?.length || 0} locações ativas encontradas`);

    // 3. Criar Set de IDs de imóveis ocupados
    const occupiedPropertyIds = new Set(
      (activeRentals || []).map(r => r.property_id)
    );

    console.log(`📊 [syncPropertyStatus] ${occupiedPropertyIds.size} imóveis deveriam estar ocupados`);

    // 4. Atualizar cada imóvel se necessário
    let updated = 0;
    let errors = 0;
    let nowOccupied = 0;
    let nowAvailable = 0;
    let keptUnavailable = 0;

    for (const property of properties || []) {
      const hasActiveRental = occupiedPropertyIds.has(property.id);
      let newStatus: string | null = null;

      // Determinar novo status
      if (property.status === "unavailable") {
        // Manter "unavailable" - status definido manualmente
        keptUnavailable++;
        continue;
      } else if (hasActiveRental && property.status !== "occupied") {
        // Tem locação ativa mas não está marcado como ocupado
        newStatus = "occupied";
        nowOccupied++;
      } else if (!hasActiveRental && property.status === "occupied") {
        // NÃO tem locação ativa mas está marcado como ocupado
        newStatus = "available";
        nowAvailable++;
      }

      // Atualizar se necessário
      if (newStatus) {
        console.log(`🔄 Atualizando imóvel ${property.id}: ${property.status} → ${newStatus}`);
        
        const { error: updateError } = await supabase
          .from("properties")
          .update({ status: newStatus })
          .eq("id", property.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar imóvel ${property.id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      }
    }

    console.log(`✅ [syncPropertyStatus] Sincronização concluída:`);
    console.log(`   - Total de imóveis: ${properties?.length || 0}`);
    console.log(`   - Atualizados: ${updated}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`   - Agora ocupados: ${nowOccupied}`);
    console.log(`   - Agora disponíveis: ${nowAvailable}`);
    console.log(`   - Mantidos indisponíveis: ${keptUnavailable}`);

    return {
      total: properties?.length || 0,
      updated,
      errors,
      details: {
        nowOccupied,
        nowAvailable,
        keptUnavailable,
      },
    };

  } catch (error) {
    console.error("❌ [syncPropertyStatus] Erro crítico:", error);
    throw error;
  }
}

/**
 * Sincroniza o status de UM imóvel específico baseado em suas locações
 * 
 * @param propertyId - ID do imóvel
 * @returns Novo status do imóvel
 */
export async function syncPropertyStatus(propertyId: string): Promise<string> {
  console.log(`🔄 [syncPropertyStatus] Sincronizando imóvel ${propertyId}...`);

  try {
    // 1. Buscar o imóvel
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, status")
      .eq("id", propertyId)
      .single();

    if (propError) throw propError;

    // 2. Verificar se tem locação ativa
    const { data: activeRentals, error: rentalsError } = await supabase
      .from("rentals")
      .select("id")
      .eq("property_id", propertyId)
      .eq("status", "active");

    if (rentalsError) throw rentalsError;

    const hasActiveRental = (activeRentals || []).length > 0;

    // 3. Determinar status correto
    let correctStatus: string;
    
    if (property.status === "unavailable") {
      // Manter "unavailable" - status definido manualmente
      correctStatus = "unavailable";
    } else if (hasActiveRental) {
      correctStatus = "occupied";
    } else {
      correctStatus = "available";
    }

    // 4. Atualizar se necessário
    if (property.status !== correctStatus) {
      console.log(`🔄 Atualizando imóvel: ${property.status} → ${correctStatus}`);
      
      const { error: updateError } = await supabase
        .from("properties")
        .update({ status: correctStatus })
        .eq("id", propertyId);

      if (updateError) throw updateError;
    }

    console.log(`✅ [syncPropertyStatus] Imóvel ${propertyId} sincronizado: ${correctStatus}`);
    return correctStatus;

  } catch (error) {
    console.error(`❌ [syncPropertyStatus] Erro ao sincronizar imóvel ${propertyId}:`, error);
    throw error;
  }
}