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
 * For production, implement proper bcrypt comparison
 */
function validatePassword(inputPassword: string, storedPassword: string): boolean {
  // Direct comparison for now
  // TODO: Implement bcrypt.compare() for production
  return inputPassword === storedPassword;
}

/**
 * Login using system_users table only
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    console.log("🔐 Iniciando login com system_users...");

    // 1. Search for user by email OR username
    // Using explicit any casting to completely bypass the deep type instantiation issue
    const table: any = supabase.from("system_users");
    
    let { data: users, error: queryError } = await table
      .select("*")
      .eq("email", credentials.email)
      .eq("status", "active");

    // If not found by email, try username
    if (!users || users.length === 0) {
       const result = await table
        .select("*")
        .eq("username", credentials.email)
        .eq("status", "active");
        
       users = result.data;
       queryError = result.error;
    }
    
    // Explicit casting to expected type
    const foundUsers = users as SystemUser[];

    if (queryError) {
      console.error("❌ Erro ao buscar usuário:", queryError);
      return { success: false, error: "Erro ao buscar usuário" };
    }

    if (!foundUsers || foundUsers.length === 0) {
      console.warn("⚠️ Usuário não encontrado ou inativo");
      return { success: false, error: "Usuário não encontrado ou inativo" };
    }

    const user = foundUsers[0];
    console.log("✅ Usuário encontrado:", user.username);

    // 2. Validate password
    const isPasswordValid = validatePassword(credentials.password, user.password);

    if (!isPasswordValid) {
      console.warn("⚠️ Senha incorreta");
      return { success: false, error: "Senha incorreta" };
    }

    console.log("✅ Senha validada com sucesso");

    // 3. Create local session
    const session: UserSession = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    // 4. Save session to localStorage
    localStorage.setItem("auth_session", JSON.stringify(session));
    localStorage.setItem("auth_user", JSON.stringify(session.user));

    console.log("✅ Sessão criada com sucesso");
    return { success: true, user: session.user };

  } catch (error) {
    console.error("❌ Erro durante login:", error);
    return { success: false, error: "Erro ao processar login" };
  }
}

/**
 * Logout - clear local session
 */
export function logout(): void {
  localStorage.removeItem("auth_session");
  localStorage.removeItem("auth_user");
  console.log("✅ Logout realizado");
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
