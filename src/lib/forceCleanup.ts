/**
 * FORÇA LIMPEZA IMEDIATA DO LOCALSTORAGE
 * 
 * Este script executa ANTES de qualquer outro código no app.
 * Remove o ID fantasma e qualquer dado corrompido do localStorage.
 */

// ID fantasma que precisa ser removido
const PHANTOM_ID = "333e45ec-63fc-4e4d-a9b6-81a6b2ebe19a";

/**
 * Executa limpeza síncrona do localStorage
 * DEVE ser chamado ANTES de qualquer renderização
 */
export function forceCleanupNow(): void {
  if (typeof window === "undefined") return;

  try {
    console.log("🧹 FORÇA LIMPEZA: Iniciando limpeza automática do localStorage...");

    // Buscar currentUser
    const currentUserStr = localStorage.getItem("currentUser");
    
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        
        // Se for o ID fantasma, LIMPAR TUDO IMEDIATAMENTE
        if (currentUser?.id === PHANTOM_ID) {
          console.log("🚨 FORÇA LIMPEZA: ID FANTASMA DETECTADO! Limpando TUDO...");
          localStorage.clear();
          console.log("✅ FORÇA LIMPEZA: localStorage completamente limpo!");
          
          // Redirecionar para login
          if (window.location.pathname !== "/login") {
            console.log("🔄 FORÇA LIMPEZA: Redirecionando para login...");
            window.location.href = "/login";
          }
          return;
        }

        console.log("✅ FORÇA LIMPEZA: ID válido encontrado, nenhuma ação necessária");
      } catch (error) {
        console.error("❌ FORÇA LIMPEZA: Erro ao parsear currentUser, limpando...");
        localStorage.clear();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    } else {
      console.log("ℹ️ FORÇA LIMPEZA: Nenhum usuário no localStorage");
    }
  } catch (error) {
    console.error("❌ FORÇA LIMPEZA: Erro durante limpeza:", error);
  }
}

// Executar imediatamente quando o módulo for importado
if (typeof window !== "undefined") {
  forceCleanupNow();
}