import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  user?: UserSession["user"];
  error?: string;
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
    const table: any = supabase.from("system_users");
    
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
    console.log("✅ User found:", user.username, "| Name:", user.name);

    // 2. Validate password using password_hash
    const isPasswordValid = validatePassword(credentials.password, user.password_hash);

    if (!isPasswordValid) {
      console.warn("⚠️ Invalid password");
      return { success: false, error: "Senha incorreta" };
    }

    console.log("✅ Password validated successfully");

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

    // 4. CLEAR ALL OLD SESSIONS FIRST
    console.log("🧹 Clearing all old sessions...");
    localStorage.removeItem("auth_session");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("rental_auth_user");
    localStorage.removeItem("currentUser");

    // 5. Save NEW session
    localStorage.setItem("auth_session", JSON.stringify(session));
    localStorage.setItem("auth_user", JSON.stringify(session.user));

    console.log("✅ Session created successfully for:", session.user.name);
    console.log("✅ Username:", session.user.username);
    console.log("✅ Role:", session.user.role);

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