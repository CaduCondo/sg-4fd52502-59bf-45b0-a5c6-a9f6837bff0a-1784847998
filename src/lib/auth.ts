import { User as UserType } from "@/types";
import { userStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = "rental_auth_user";

/**
 * Tenta criar um usuário no Supabase Auth e vincular ao system_users
 */
async function migrateUserClientSide(systemUser: any, password: string): Promise<string | null> {
  try {
    console.log("🔄 Iniciando migração client-side para:", systemUser.email);
    
    // 1. Tentar criar usuário no Auth (SignUp)
    // Nota: Se o usuário já existir no Auth mas não no mapping, vai dar erro de "User already registered", 
    // então tentamos fazer signIn logo em seguida ou tratamos o erro.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: systemUser.email,
      password: password,
      options: {
        data: {
          name: systemUser.name,
          role: systemUser.role
        }
      }
    });

    let authUserId = signUpData.user?.id;

    if (signUpError) {
      console.log("⚠️ SignUp info:", signUpError.message);
      // Se já existe, tentamos pegar o ID fazendo login (se a senha bater) ou admin user se possível (não temos acesso admin aqui).
      // Vamos assumir que se falhar o signup, tentamos logar para pegar o ID.
      if (signUpError.message.includes("already registered")) {
         const { data: signInData } = await supabase.auth.signInWithPassword({
            email: systemUser.email,
            password: password
         });
         authUserId = signInData.user?.id;
      }
    }

    if (!authUserId) {
      console.error("❌ Falha ao obter Auth User ID para migração.");
      return null;
    }

    // 2. Criar vínculo na tabela auth_user_mapping
    const { error: mappingError } = await supabase
      .from("auth_user_mapping")
      .insert({
        system_user_id: systemUser.id,
        auth_user_id: authUserId,
        email: systemUser.email
      });

    if (mappingError) {
      // Ignorar erro se for duplicidade (pode ter sido criado concorrentemente)
      if (!mappingError.message.includes("duplicate key")) {
         console.error("❌ Erro ao criar mapping:", mappingError);
         return null;
      }
    }

    console.log("✅ Migração client-side concluída com sucesso!");
    return authUserId;
  } catch (err) {
    console.error("❌ Erro inesperado na migração:", err);
    return null;
  }
}

/**
 * Login usando Supabase Auth (novo sistema)
 * @param emailOrUsername - Email ou username do usuário
 * @param password - Senha do usuário
 * @returns Usuário autenticado ou null
 */
export async function loginWithSupabaseAuth(emailOrUsername: string, password: string): Promise<UserType | null> {
  try {
    // Tentar buscar usuário em system_users por email ou username
    const { data: systemUser } = await supabase
      .from("system_users")
      .select("*")
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .maybeSingle();

    if (!systemUser) {
      console.log("❌ Usuário não encontrado em system_users");
      // Tentar login direto no Auth como fallback (caso seja um usuário criado apenas no Auth)
      const { data: directAuth, error: directError } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password: password
      });
      
      if (!directError && directAuth.user) {
         // Usuário existe no Auth mas não no system_users? 
         // Idealmente deveria existir em ambos. Por enquanto retornamos null para forçar padrão.
         // Ou podemos retornar um usuário básico.
         console.log("⚠️ Usuário encontrado apenas no Auth, sem perfil de sistema.");
      }
      return null;
    }

    // Verificar se usuário já foi migrado para auth.users
    const { data: mapping } = await supabase
      .from("auth_user_mapping")
      .select("*")
      .eq("system_user_id", systemUser.id)
      .maybeSingle();

    // Se não foi migrado, migrar agora (Client Side para evitar erro de RPC 404/Missing Table)
    if (!mapping) {
      console.log("⚠️ Usuário não migrado. Iniciando migração client-side...");
      await migrateUserClientSide(systemUser, password);
    }

    // Tentar fazer login no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: systemUser.email,
      password: password
    });

    if (authError || !authData.user) {
      console.log("❌ Erro ao autenticar no Supabase Auth:", authError?.message);
      return null;
    }

    console.log("✅ Autenticado no Supabase Auth! User ID:", authData.user.id);

    // Mapear role do sistema
    let role: "admin" | "user" | "broker" | "financial" = "user";
    const dbRole = systemUser.role?.toLowerCase();
    
    if (dbRole === "admin" || dbRole === "administrador") role = "admin";
    else if (dbRole === "corretor" || dbRole === "broker") role = "broker";
    else if (dbRole === "financeiro" || dbRole === "financial") role = "financial";

    const user: UserType = {
      id: systemUser.id,
      name: systemUser.name || systemUser.email?.split("@")[0] || "Admin",
      username: systemUser.username || systemUser.email?.split("@")[0] || "",
      email: systemUser.email || authData.user.email || "",
      password: "",
      role: role,
      phone: systemUser.phone || "",
      rg: systemUser.rg || "",
      cpf: systemUser.cpf || "",
      active: systemUser.active ?? true,
      createdAt: systemUser.created_at || authData.user.created_at,
      photo: systemUser.photo || undefined,
    };

    // Sincronizar com localStorage para compatibilidade
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("currentUser", JSON.stringify({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: role,
        photo: user.photo,
      }));
    }

    return user;
  } catch (error) {
    console.error("❌ Erro no login com Supabase Auth:", error);
    return null;
  }
}

// Helper function to check if user is authenticated via Supabase
async function getSupabaseUser(): Promise<UserType | null> {
  try {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (!supabaseUser) return null;

    // Get mapping from auth_user_mapping
    const { data: mapping } = await supabase
      .from("auth_user_mapping")
      .select("*")
      .eq("auth_user_id", supabaseUser.id)
      .maybeSingle();

    if (!mapping) return null;

    // Get user profile from system_users table
    const { data: profile } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", mapping.system_user_id)
      .maybeSingle();

    if (profile) {
      // Map Portuguese roles to English internal roles
      let role: "admin" | "user" | "broker" | "financial" = "user";
      const dbRole = profile.role?.toLowerCase();
      
      if (dbRole === "admin" || dbRole === "administrador") role = "admin";
      else if (dbRole === "corretor" || dbRole === "broker") role = "broker";
      else if (dbRole === "financeiro" || dbRole === "financial") role = "financial";
      
      const user: UserType = {
        id: profile.id,
        name: profile.name || supabaseUser.email?.split("@")[0] || "Admin",
        username: profile.username || supabaseUser.email?.split("@")[0] || "",
        email: profile.email || supabaseUser.email || "",
        password: "", // Not needed for authenticated users
        role: role,
        phone: profile.phone || "",
        rg: profile.rg || "",
        cpf: profile.cpf || "",
        active: profile.active ?? true,
        createdAt: profile.created_at || supabaseUser.created_at,
        photo: profile.photo || undefined,
      };

      // Sync to localStorage for compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      }

      return user;
    }
  } catch (error) {
    console.error("Error getting Supabase user:", error);
  }

  return null;
}

// Get user from localStorage (fallback)
function getLocalUser(): UserType | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(AUTH_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Login with localStorage (legacy system)
export function login(username: string, password: string): UserType | null {
  const users = userStorage.getAll();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    }
    return user;
  }

  return null;
}

// Logout from both systems
export async function logout(): Promise<void> {
  // Logout from Supabase
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out from Supabase:", error);
  }

  // Clear localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
  }
}

// Get current user (checks Supabase first, then localStorage)
export async function getCurrentUserAsync(): Promise<UserType | null> {
  // Try Supabase first
  const supabaseUser = await getSupabaseUser();
  if (supabaseUser) return supabaseUser;

  // Fallback to localStorage
  return getLocalUser();
}

// Synchronous version (checks localStorage only)
export function getCurrentUser(): UserType | null {
  return getLocalUser();
}

// Check if user is authenticated (checks both systems)
export async function isAuthenticatedAsync(): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user !== null;
}

// Synchronous version (checks localStorage only)
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// Check if user has specific role
export async function hasRoleAsync(role: "admin" | "broker" | "financial" | "user"): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user?.role === role;
}

// Synchronous version
export function hasRole(role: "admin" | "broker" | "financial" | "user"): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

// Check if user has any of the specified roles
export async function hasAnyRoleAsync(roles: ("admin" | "broker" | "financial" | "user")[]): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user ? roles.includes(user.role) : false;
}

// Synchronous version
export function hasAnyRole(roles: ("admin" | "broker" | "financial" | "user")[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  role: "admin" | "user" | "broker" | "financial";
  token?: string;
  // Optional fields for compatibility with SystemUser
  username?: string;
  password?: string;
  phone?: string;
  rg?: string;
  cpf?: string;
  active?: boolean;
  createdAt?: string;
}

export type Role = "admin" | "user" | "broker" | "financial";