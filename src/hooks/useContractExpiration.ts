import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para verificar e inativar automaticamente contratos vencidos
 * DESABILITADO: Verificação automática removida para evitar refreshes indesejados
 * Execute manualmente quando necessário via API ou script
 */
export function useContractExpiration() {
  useEffect(() => {
    // DESABILITADO: Verificação automática comentada para evitar refreshes
    // Se precisar verificar contratos expirados, faça manualmente via script
    console.log("⚠️ useContractExpiration: Hook desabilitado - verificação manual apenas");
    
    // Não executar mais verificações automáticas
    return () => {};
  }, []);
}