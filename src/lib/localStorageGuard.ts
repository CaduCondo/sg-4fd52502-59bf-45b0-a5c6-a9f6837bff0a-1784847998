/**
 * MIDDLEWARE DE PROTEÇÃO CONTRA LOCALSTORAGE CORROMPIDO
 * 
 * Este arquivo força a limpeza de dados corrompidos do localStorage
 * toda vez que o usuário carrega qualquer página do sistema.
 * 
 * FUNCIONA ASSIM:
 * 1. Verifica se existe um ID no localStorage
 * 2. Valida se esse ID realmente existe no banco de dados
 * 3. Se não existe, LIMPA TUDO e redireciona para login
 * 4. Previne erro 406 e loop infinito de login
 */

import { supabase } from "@/integrations/supabase/client";

// Lista de IDs conhecidos como inválidos/fantasmas
const BLACKLISTED_IDS = [
  "333e45ec-63fc-4e4d-a9b6-81a6b2ebe19a", // ID fantasma original
];

/**
 * Valida o localStorage e limpa se estiver corrompido
 * DEVE SER CHAMADO NO _app.tsx ANTES DE QUALQUER OUTRA COISA
 */
export async function validateAndCleanLocalStorage(): Promise<boolean> {
  try {
    console.log("🛡️ LocalStorage Guard: Iniciando validação...");
    
    // Verificar se existe usuário no localStorage
    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) {
      console.log("✅ LocalStorage Guard: Nenhum usuário no localStorage");
      return true; // Nenhum usuário = OK
    }

    let currentUser;
    try {
      currentUser = JSON.parse(currentUserStr);
    } catch (e) {
      console.error("❌ LocalStorage Guard: JSON corrompido, limpando...");
      forceCleanLocalStorage();
      return false;
    }

    const userId = currentUser?.id;
    if (!userId) {
      console.error("❌ LocalStorage Guard: ID não encontrado, limpando...");
      forceCleanLocalStorage();
      return false;
    }

    // Verificar se o ID está na blacklist
    if (BLACKLISTED_IDS.includes(userId)) {
      console.error("🚫 LocalStorage Guard: ID BLACKLISTED detectado:", userId);
      console.log("🧹 Limpando ID fantasma do localStorage...");
      forceCleanLocalStorage();
      return false;
    }

    // Validar se o ID realmente existe no banco
    console.log("🔍 LocalStorage Guard: Validando ID no banco:", userId);
    const { data, error } = await supabase
      .from("system_users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code === "PGRST116") {
      console.error("❌ LocalStorage Guard: ID não existe no banco (406)");
      forceCleanLocalStorage();
      return false;
    }

    if (error) {
      console.error("❌ LocalStorage Guard: Erro ao validar:", error);
      forceCleanLocalStorage();
      return false;
    }

    if (!data) {
      console.error("❌ LocalStorage Guard: Usuário não encontrado no banco");
      forceCleanLocalStorage();
      return false;
    }

    console.log("✅ LocalStorage Guard: ID válido, continuando...");
    return true;

  } catch (error) {
    console.error("❌ LocalStorage Guard: Erro crítico:", error);
    forceCleanLocalStorage();
    return false;
  }
}

/**
 * Limpa COMPLETAMENTE o localStorage e força um estado limpo
 */
export function forceCleanLocalStorage(): void {
  console.log("🧹🔥 LIMPEZA FORÇADA DO LOCALSTORAGE INICIADA!");
  
  // Remover chaves específicas
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("currentUser");
  
  // Log para debug
  console.log("✅ localStorage.isAuthenticated removido");
  console.log("✅ localStorage.currentUser removido");
  console.log("🔥 LIMPEZA COMPLETA! Estado limpo garantido.");
}

/**
 * Hook para usar em páginas protegidas
 * Redireciona automaticamente para login se inválido
 */
export function useLocalStorageGuard(router: any) {
  if (typeof window === "undefined") return; // Skip SSR

  validateAndCleanLocalStorage().then((isValid) => {
    if (!isValid) {
      console.log("🔐 Redirecionando para login devido a dados inválidos...");
      router.push("/login");
    }
  });
}