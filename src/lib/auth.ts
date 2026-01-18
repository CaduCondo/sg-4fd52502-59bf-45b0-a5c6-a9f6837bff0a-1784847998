import { User as UserType } from "@/types";
import { userStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = "rental_auth_user";

/**
 * SISTEMA DE AUTENTICAÇÃO SIMPLIFICADO - 100% FUNCIONAL
 * 
 * Autenticação direta via system_users sem complexidade desnecessária
 * - Valida credenciais diretamente no banco
 * - Cria sessão local
 * - Sem migração automática (evita erros 401)
 */

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
    name: systemUser.name || systemUser.email?.split("@")[0] || "Usuário",
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
 * LOGIN PRINCIPAL - SISTEMA SIMPLIFICADO
 * 
 * Fluxo direto:
 * 1. Busca usuário por username ou email
 * 2. Valida senha
 * 3. Cria sessão local
 * 4. Retorna usuário autenticado
 */
export async function loginWithSupabaseAuth(emailOrUsername: string, password: string): Promise<UserType | null> {
  try {
    console.log("🔐 Iniciando login para:", emailOrUsername);
    
    // Buscar usuário por username OU email
    const { data: users, error } = await supabase
      .from("system_users")
      .select("*")
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .limit(1);

    if (error) {
      console.error("❌ Erro ao buscar usuário:", error);
      return null;
    }

    if (!users || users.length === 0) {
      console.log("❌ Usuário não encontrado");
      return null;
    }

    const systemUser = users[0];

    // Validar senha
    if (systemUser.password !== password) {
      console.log("❌ Senha incorreta");
      return null;
    }

    console.log("✅ Login bem-sucedido!");
    console.log("✅ Usuário:", systemUser.name);
    console.log("✅ Role:", systemUser.role);

    // Criar sessão local
    const user = mapSystemUserToUserType(systemUser);
    syncToLocalStorage(user);
    
    return user;

  } catch (error) {
    console.error("❌ Erro no login:", error);
    return null;
  }
}

// Get user from localStorage
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

// Logout
export async function logout(): Promise<void> {
  // Clear localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
  }
}

// Get current user (synchronous - checks localStorage only)
export function getCurrentUser(): UserType | null {
  return getLocalUser();
}

// Async version for compatibility
export async function getCurrentUserAsync(): Promise<UserType | null> {
  return getLocalUser();
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// Async version for compatibility
export async function isAuthenticatedAsync(): Promise<boolean> {
  return isAuthenticated();
}

// Check if user has specific role
export function hasRole(role: "admin" | "broker" | "financial" | "user"): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

// Async version for compatibility
export async function hasRoleAsync(role: "admin" | "broker" | "financial" | "user"): Promise<boolean> {
  return hasRole(role);
}

// Check if user has any of the specified roles
export function hasAnyRole(roles: ("admin" | "broker" | "financial" | "user")[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

// Async version for compatibility
export async function hasAnyRoleAsync(roles: ("admin" | "broker" | "financial" | "user")[]): Promise<boolean> {
  return hasAnyRole(roles);
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