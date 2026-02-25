import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { LoginCredentials, LoginResult } from "@/types"; // Importar tipos globais

type SystemUser = Tables<"system_users">;

/**
 * Local authentication service - uses ONLY system_users table
 * NO Supabase Auth integration
 */

interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    role: SystemUser["role"];
    photo?: string | null;
  };
  expiresAt: number;
}

/**
 * Simple password validation (direct comparison)
 * TODO: For production, implement proper bcrypt comparison
 */
function validatePassword(inputPassword: string, storedPasswordHash: string): boolean {
  // TEMPORÁRIO: Comparação direta até bcrypt ser implementado
  // Em produção, usar: bcrypt.compare(inputPassword, storedPasswordHash)
  console.log("Comparando senha:", inputPassword, "com hash armazenada:", storedPasswordHash);
  return inputPassword === storedPasswordHash;
}

/**
 * Login using system_users table only
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    console.log("🔐 Starting login for:", credentials.email);

    // 1. Search for user by username OR email
    const table = supabase.from("system_users");
    
    // Buscar usuário (username ou email)
    // Precisamos buscar login_attempts e blocked_until também
    let { data: users, error: queryError } = await table
      .select("*")
      .eq("username", credentials.email)
      .eq("active", true);

    // If not found by username, try email
    if (!users || users.length === 0) {
       const result = await table
        .select("*")
        .eq("email", credentials.email)
        .eq("active", true);
        
       users = result.data;
       queryError = result.error;
    }
    
    const foundUsers = users as SystemUser[];

    if (queryError) {
      console.error("❌ Error fetching user:", queryError);
      return { success: false, error: "Erro ao buscar usuário" };
    }

    if (!foundUsers || foundUsers.length === 0) {
      console.warn("⚠️ User not found or inactive");
      return { success: false, error: "Usuário não encontrado ou inativo" };
    }

    const user = foundUsers[0];
    console.log("✅ User found:", user.username, "| ID:", user.id);

    // 1.5 VERIFICAR SE ESTÁ BLOQUEADO
    if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
      const blockedDate = new Date(user.blocked_until);
      const timeLeft = Math.ceil((blockedDate.getTime() - Date.now()) / 60000);
      console.warn(`⛔ User blocked until ${blockedDate.toLocaleString()}`);
      return { 
        success: false, 
        error: `Conta bloqueada temporariamente por muitas tentativas falhas. Tente novamente em ${timeLeft} minutos.` 
      };
    }

    // 2. Validate password using password_hash
    console.log("🔐 Validating password...");
    
    const isPasswordValid = validatePassword(credentials.password, user.password_hash);

    if (!isPasswordValid) {
      console.warn("⚠️ Invalid password");
      
      // INCREMENTAR TENTATIVAS FALHAS
      const newAttempts = (user.login_attempts || 0) + 1;
      const updates: any = { login_attempts: newAttempts };
      
      let errorMsg = "Senha incorreta";
      
      // SE ATINGIU 5 TENTATIVAS -> BLOQUEAR POR 30 MINUTOS
      if (newAttempts >= 5) {
        const blockUntil = new Date(Date.now() + 30 * 60000); // +30 minutos
        updates.blocked_until = blockUntil.toISOString();
        console.warn(`⛔ BLOCKING USER until ${blockUntil.toLocaleString()}`);
        errorMsg = "Muitas tentativas falhas. Conta bloqueada por 30 minutos.";
      } else {
        const remaining = 5 - newAttempts;
        errorMsg = `Senha incorreta. Você tem mais ${remaining} tentativa(s) antes do bloqueio.`;
      }
      
      // Atualizar no banco
      await supabase
        .from("system_users")
        .update(updates)
        .eq("id", user.id);
        
      return { success: false, error: errorMsg };
    }

    console.log("✅ Password validated successfully");

    // 2.5 RESETAR TENTATIVAS EM CASO DE SUCESSO
    if ((user.login_attempts || 0) > 0 || user.blocked_until) {
      await supabase
        .from("system_users")
        .update({ 
          login_attempts: 0, 
          blocked_until: null 
        })
        .eq("id", user.id);
    }

    // 3. Create local session with ALL user data
    const session: UserSession = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        photo: user.photo,
      },
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    // 4. CLEAR ALL OLD SESSIONS
    console.log("🧹 Clearing old sessions...");
    localStorage.removeItem("auth_session");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("rental_auth_user");
    localStorage.removeItem("currentUser");

    // 5. Save NEW session
    localStorage.setItem("auth_session", JSON.stringify(session));
    localStorage.setItem("auth_user", JSON.stringify(session.user));

    return { success: true, user: session.user };

  } catch (error) {
    console.error("❌ Error during login:", error);
    return { success: false, error: "Erro ao processar login" };
  }
}

/**
 * Logout - clear local session
 */
export function logout(): void {
  localStorage.removeItem("auth_session");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("rental_auth_user");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("login_attempts");
  localStorage.removeItem("locked_until");
  console.log("✅ Logout completed");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  try {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return false;

    const session: UserSession = JSON.parse(sessionStr);
    
    // Check if session expired
    if (Date.now() > session.expiresAt) {
      logout();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user from session
 */
export function getCurrentUser(): UserSession["user"] | null {
  try {
    const userStr = localStorage.getItem("auth_user");
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Renew session expiration
 */
export function renewSession(): boolean {
  try {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return false;

    const session: UserSession = JSON.parse(sessionStr);
    session.expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    
    localStorage.setItem("auth_session", JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}