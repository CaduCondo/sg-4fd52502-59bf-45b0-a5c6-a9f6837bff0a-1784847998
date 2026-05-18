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

/**
 * Force cleanup of dialog overlays and focus traps
 * Use this when dialogs close to prevent pointer-events blocking
 */
export function forceDialogCleanup(): void {
  console.log("🧹 Forçando limpeza de overlays de diálogo...");
  
  // Remove active element focus
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  
  // Find and remove ALL Radix dialog overlays
  const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
  overlays.forEach(overlay => {
    if (overlay instanceof HTMLElement) {
      overlay.remove();
    }
  });
  
  // Find and remove ALL Radix focus guards
  const focusGuards = document.querySelectorAll('[data-radix-focus-guard]');
  focusGuards.forEach(guard => {
    if (guard instanceof HTMLElement) {
      guard.remove();
    }
  });
  
  // Clean up Radix portals without open dialogs
  const portals = document.querySelectorAll('[data-radix-portal]');
  portals.forEach(portal => {
    const hasOpenDialog = portal.querySelector('[data-state="open"]');
    if (!hasOpenDialog) {
      if (portal instanceof HTMLElement) {
        portal.remove();
      }
    }
  });
  
  // Force reset body styles
  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.body.removeAttribute('data-scroll-locked');
  
  // Reset pointer-events on all elements (except disabled ones)
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    if (el instanceof HTMLElement && 
        el.style.pointerEvents === 'none' && 
        !el.hasAttribute('disabled') &&
        !el.hasAttribute('aria-hidden')) {
      el.style.pointerEvents = '';
    }
  });
  
  console.log("✅ Limpeza de overlays concluída");
}