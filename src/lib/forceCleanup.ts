/**
 * Force cleanup utility
 * Clears ALL authentication and session data
 */

/**
 * Force logout and cleanup
 */
export async function forceLogout(): Promise<void> {
  try {
    console.log("🧹 Iniciando limpeza forçada...");

    // 1. Clear localStorage
    localStorage.clear();

    // 2. Clear sessionStorage
    sessionStorage.clear();

    console.log("✅ Limpeza concluída");
  } catch (error) {
    console.error("❌ Erro durante limpeza:", error);
  }
}

/**
 * Alias for forceLogout to maintain compatibility
 */
export const forceCleanupNow = forceLogout;

/**
 * Clear all auth-related data
 */
export function clearAuthData(): void {
  const authKeys = [
    "auth_session",
    "auth_user",
    "supabase.auth.token",
    "sb-auth-token",
  ];

  authKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  console.log("✅ Dados de autenticação limpos");
}

/**
 * Check and fix corrupted auth state
 */
export function checkAndFixAuthState(): boolean {
  try {
    const sessionStr = localStorage.getItem("auth_session");
    
    if (!sessionStr) {
      return false; // No session
    }

    const session = JSON.parse(sessionStr);
    
    // Validate session structure
    if (!session.user || !session.expiresAt) {
      console.warn("⚠️ Sessão corrompida, limpando...");
      clearAuthData();
      return false;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      console.warn("⚠️ Sessão expirada, limpando...");
      clearAuthData();
      return false;
    }

    return true; // Session is valid
  } catch (error) {
    console.error("❌ Erro ao verificar sessão:", error);
    clearAuthData();
    return false;
  }
}