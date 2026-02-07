import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para verificar e inativar automaticamente contratos vencidos
 * Executa verificação ao montar o componente e a cada 1 hora
 */
export function useContractExpiration() {
  useEffect(() => {
    const checkExpiredContracts = async () => {
      try {
        console.log("🔍 Verificando contratos vencidos...");
        
        const today = new Date().toISOString().split("T")[0];
        
        // Buscar locações ativas com data final menor que hoje
        const { data: expiredRentals, error: fetchError } = await supabase
          .from("rentals")
          .select("id, property_id, tenant_id, end_date")
          .eq("status", "active")
          .lt("end_date", today);

        if (fetchError) {
          console.error("Erro ao buscar contratos vencidos:", fetchError);
          return;
        }

        if (!expiredRentals || expiredRentals.length === 0) {
          console.log("✅ Nenhum contrato vencido encontrado");
          return;
        }

        console.log(`📋 Encontrados ${expiredRentals.length} contratos vencidos`);

        // Processar cada contrato vencido
        for (const rental of expiredRentals) {
          console.log(`⚙️ Processando locação ${rental.id}...`);

          // 1. Atualizar status da locação para terminated
          const { error: rentalError } = await supabase
            .from("rentals")
            .update({ 
              status: "terminated",
              updated_at: new Date().toISOString(),
            })
            .eq("id", rental.id);

          if (rentalError) {
            console.error(`❌ Erro ao atualizar locação ${rental.id}:`, rentalError);
            continue;
          }

          // 2. Atualizar status do imóvel para available
          if (rental.property_id) {
            const { error: propertyError } = await supabase
              .from("properties")
              .update({ 
                status: "available",
                updated_at: new Date().toISOString(),
              })
              .eq("id", rental.property_id);

            if (propertyError) {
              console.error(`❌ Erro ao atualizar imóvel ${rental.property_id}:`, propertyError);
            } else {
              console.log(`✅ Imóvel ${rental.property_id} liberado`);
            }
          }

          // 3. Atualizar status do inquilino para inactive
          if (rental.tenant_id) {
            const { error: tenantError } = await supabase
              .from("tenants")
              .update({ 
                status: "inactive",
                updated_at: new Date().toISOString(),
              })
              .eq("id", rental.tenant_id);

            if (tenantError) {
              console.error(`❌ Erro ao atualizar inquilino ${rental.tenant_id}:`, tenantError);
            } else {
              console.log(`✅ Inquilino ${rental.tenant_id} inativado`);
            }
          }

          console.log(`✅ Locação ${rental.id} processada com sucesso`);
        }

        console.log(`🎉 Processamento concluído! ${expiredRentals.length} contratos inativados`);
      } catch (error) {
        console.error("💥 Erro ao verificar contratos vencidos:", error);
      }
    };

    // Executar verificação imediatamente
    checkExpiredContracts();

    // Configurar verificação periódica (a cada 1 hora)
    const intervalId = setInterval(checkExpiredContracts, 60 * 60 * 1000);

    // Cleanup ao desmontar
    return () => clearInterval(intervalId);
  }, []);
}