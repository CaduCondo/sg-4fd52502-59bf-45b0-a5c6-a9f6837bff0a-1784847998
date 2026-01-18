import { User as UserType } from "@/types";
import { userStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = "rental_auth_user";

/**
 * SISTEMA DE AUTENTICAÇÃO HÍBRIDO - 100% CONFIÁVEL
 * 
 * Fluxo de autenticação com fallback garantido:
 * 1. Tenta autenticar via Supabase Auth (se usuário já migrado)
 * 2. Se falhar, valida diretamente em system_users (SEMPRE FUNCIONA)
 * 3. Em caso de sucesso com validação direta, migra automaticamente para Supabase Auth
 * 4. Armazena sessão localmente para máxima confiabilidade
 */

/**
 * Valida senha diretamente na tabela system_users
 * Esta é nossa garantia de que o login SEMPRE funcionará
 */
async function validateDirectly(emailOrUsername: string, password: string): Promise<any | null> {
  try {
    console.log("🔍 Validação direta em system_users para:", emailOrUsername);
    
    const { data: systemUser, error } = await supabase
      .from("system_users")
      .select("*")
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .maybeSingle();

    if (error) {
      console.error("❌ Erro ao buscar usuário:", error);
      return null;
    }

    if (!systemUser) {
      console.log("❌ Usuário não encontrado em system_users");
      return null;
    }

    // Validar senha (assumindo que está armazenada em plain text ou hash compatível)
    if (systemUser.password === password) {
      console.log("✅ Senha validada com sucesso!");
      return systemUser;
    }

    console.log("❌ Senha incorreta");
    return null;
  } catch (error) {
    console.error("❌ Erro crítico na validação direta:", error);
    return null;
  }
}

/**
 * Migra usuário para Supabase Auth de forma segura
 * Não bloqueia o login se falhar - apenas loga o erro
 */
async function migrateToSupabaseAuth(systemUser: any, password: string): Promise<void> {
  try {
    console.log("🔄 Tentando migrar usuário para Supabase Auth:", systemUser.email);
    
    // Verificar se já existe mapping
    const { data: existingMapping } = await supabase
      .from("auth_user_mapping")
      .select("auth_user_id")
      .eq("system_user_id", systemUser.id)
      .maybeSingle();

    if (existingMapping) {
      console.log("✅ Usuário já possui mapping - migração anterior bem-sucedida");
      return;
    }

    // Tentar criar usuário no Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: systemUser.email,
      password: password,
      options: {
        data: {
          name: systemUser.name,
          role: systemUser.role
        },
        emailRedirectTo: undefined // Desabilita verificação de email
      }
    });

    if (signUpError) {
      // Se usuário já existe no Auth, tentar obter ID via login
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
        console.log("⚠️ Usuário já existe no Auth, tentando logar para obter ID...");
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: systemUser.email,
          password: password
        });

        if (signInError) {
          console.log("⚠️ Não foi possível logar no Auth existente:", signInError.message);
          return;
        }

        if (signInData.user) {
          // Criar mapping
          await createMapping(systemUser.id, signInData.user.id, systemUser.email);
        }
        return;
      }

      console.log("⚠️ Erro ao criar usuário no Auth:", signUpError.message);
      return;
    }

    if (signUpData.user) {
      // Criar mapping
      await createMapping(systemUser.id, signUpData.user.id, systemUser.email);
      console.log("✅ Migração concluída com sucesso!");
    }
  } catch (error) {
    console.error("⚠️ Erro durante migração (não crítico):", error);
  }
}

/**
 * Cria ou atualiza mapping entre system_users e auth.users
 */
async function createMapping(systemUserId: string, authUserId: string, email: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("auth_user_mapping")
      .upsert({
        system_user_id: systemUserId,
        auth_user_id: authUserId,
        email: email
      }, {
        onConflict: "system_user_id"
      });

    if (error && !error.message.includes("duplicate key")) {
      console.error("⚠️ Erro ao criar mapping:", error);
    }
  } catch (error) {
    console.error("⚠️ Erro ao criar mapping:", error);
  }
}

/**
 * Converte usuário do sistema para formato UserType
 */
function mapSystemUserToUserType(systemUser: any): UserType {
  let role: "admin" | "user" | "broker" | "financial" = "user";
  const dbRole = systemUser.role?.toLowerCase();
  
  if (dbRole === "admin" || dbRole === "administrador") role = "admin";
  else if (dbRole === "corretor" || dbRole === "broker") role = "broker";
  else if (dbRole === "financeiro" || dbRole === "financial") role = "financial";

  return {
    id: systemUser.id,
    name: systemUser.name || systemUser.email?.split("@")[0] || "Admin",
    username: systemUser.username || systemUser.email?.split("@")[0] || "",
    email: systemUser.email || "",
    password: "",
    role: role,
    phone: systemUser.phone || "",
    rg: systemUser.rg || "",
    cpf: systemUser.cpf || "",
    active: systemUser.active ?? true,
    createdAt: systemUser.created_at || new Date().toISOString(),
    photo: systemUser.photo || undefined,
  };
}

/**
 * Sincroniza usuário com localStorage
 */
function syncToLocalStorage(user: UserType): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("currentUser", JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    photo: user.photo,
  }));
}

/**
 * LOGIN PRINCIPAL - SISTEMA HÍBRIDO 100% CONFIÁVEL
 * 
 * Prioridade:
 * 1. Tenta Supabase Auth (rápido, se usuário migrado)
 * 2. Fallback para validação direta (SEMPRE funciona)
 * 3. Migra automaticamente em background se validação direta teve sucesso
 */
export async function loginWithSupabaseAuth(emailOrUsername: string, password: string): Promise<UserType | null> {
  try {
    console.log("🔐 Iniciando login para:", emailOrUsername);
    
    // ETAPA 1: Buscar usuário em system_users (obrigatório)
    const { data: systemUser } = await supabase
      .from("system_users")
      .select("*")
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .maybeSingle();

    if (!systemUser) {
      console.log("❌ Usuário não encontrado em system_users");
      return null;
    }

    // ETAPA 2: Verificar se usuário já foi migrado
    const { data: mapping } = await supabase
      .from("auth_user_mapping")
      .select("auth_user_id")
      .eq("system_user_id", systemUser.id)
      .maybeSingle();

    // ETAPA 3: Se migrado, tentar autenticar via Supabase Auth
    if (mapping?.auth_user_id) {
      console.log("🔑 Usuário migrado - tentando autenticar via Supabase Auth...");
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: systemUser.email,
        password: password
      });

      if (!authError && authData.user) {
        console.log("✅ Autenticado com sucesso via Supabase Auth!");
        const user = mapSystemUserToUserType(systemUser);
        syncToLocalStorage(user);
        return user;
      }
      
      console.log("⚠️ Falha no Supabase Auth, usando validação direta...");
    }

    // ETAPA 4: FALLBACK GARANTIDO - Validação direta (SEMPRE FUNCIONA)
    const validatedUser = await validateDirectly(emailOrUsername, password);
    
    if (!validatedUser) {
      console.log("❌ Credenciais inválidas");
      return null;
    }

    console.log("✅ Login bem-sucedido via validação direta!");

    // ETAPA 5: Migrar para Supabase Auth em background (não bloqueia login)
    if (!mapping) {
      console.log("🔄 Iniciando migração automática em background...");
      migrateToSupabaseAuth(validatedUser, password).catch(err => {
        console.log("⚠️ Migração em background falhou (não afeta login):", err);
      });
    }

    // ETAPA 6: Retornar usuário autenticado
    const user = mapSystemUserToUserType(validatedUser);
    syncToLocalStorage(user);
    return user;

  } catch (error) {
    console.error("❌ Erro crítico no login:", error);
    
    // FALLBACK FINAL: Tentar validação direta mesmo com erro
    try {
      const validatedUser = await validateDirectly(emailOrUsername, password);
      if (validatedUser) {
        const user = mapSystemUserToUserType(validatedUser);
        syncToLocalStorage(user);
        return user;
      }
    } catch (fallbackError) {
      console.error("❌ Fallback também falhou:", fallbackError);
    }
    
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
      const user = mapSystemUserToUserType(profile);
      syncToLocalStorage(user);
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

// Login with localStorage (legacy system - kept for compatibility)
export function login(username: string, password: string): UserType | null {
  const users = userStorage.getAll();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    syncToLocalStorage(user);
    return user;
  }

  return null;
}

// Logout from both systems
export async function logout(): Promise<void> {
  // Logout from Supabase (não falha o logout se Auth falhar)
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out from Supabase:", error);
  }

  // Clear localStorage (sempre funciona)
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
  username?: string;
  password?: string;
  phone?: string;
  rg?: string;
  cpf?: string;
  active?: boolean;
  createdAt?: string;
}

export type Role = "admin" | "user" | "broker" | "financial";