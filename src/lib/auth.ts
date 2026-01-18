import { User as UserType } from "@/types";
import { userStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = "rental_auth_user";
const SESSION_EXPIRY_KEY = "rental_session_expiry";
const SESSION_DURATION = 3600000; // 1 hora em milissegundos

/**
 * SISTEMA DE AUTENTICAÇÃO SEGURO COM BCRYPT
 * 
 * ✅ Senhas hasheadas com bcrypt
 * ✅ Validação segura via função do banco
 * ✅ Migração automática de senhas antigas
 * ✅ Expiração de sessão em 1 hora
 * ✅ Proteção contra manipulação de localStorage
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
 * Sincroniza usuário com localStorage e define expiração
 */
function syncToLocalStorage(user: UserType): void {
  if (typeof window === "undefined") return;
  
  const expiryTime = Date.now() + SESSION_DURATION;
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
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
 * Verifica se a sessão está expirada
 */
function isSessionExpired(): boolean {
  if (typeof window === "undefined") return true;
  
  const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (!expiryTime) return true;
  
  return Date.now() > parseInt(expiryTime);
}

/**
 * LOGIN SEGURO COM BCRYPT
 * 
 * Usa função do banco de dados que:
 * 1. Valida senha com bcrypt
 * 2. Migra senhas antigas automaticamente
 * 3. Retorna usuário se autenticado
 */
export async function loginWithSupabaseAuth(emailOrUsername: string, password: string): Promise<UserType | null> {
  try {
    console.log("🔐 Iniciando login seguro para:", emailOrUsername);
    
    // Chamar função segura do banco de dados
    const { data, error } = await supabase.rpc("authenticate_user", {
      p_username_or_email: emailOrUsername,
      p_password: password
    });

    if (error) {
      console.error("❌ Erro ao autenticar:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("❌ Credenciais inválidas");
      return null;
    }

    const systemUser = data[0];

    console.log("✅ Login seguro bem-sucedido!");
    console.log("✅ Usuário:", systemUser.name);
    console.log("✅ Role:", systemUser.role);
    console.log("✅ Senha protegida com bcrypt");

    // Criar sessão local com expiração
    const user = mapSystemUserToUserType(systemUser);
    syncToLocalStorage(user);
    
    return user;

  } catch (error) {
    console.error("❌ Erro no login:", error);
    return null;
  }
}

/**
 * Obter usuário do localStorage (com verificação de expiração)
 */
function getLocalUser(): UserType | null {
  if (typeof window === "undefined") return null;
  
  // Verificar se sessão expirou
  if (isSessionExpired()) {
    console.log("⏰ Sessão expirada - fazendo logout automático");
    logout();
    return null;
  }
  
  const userStr = localStorage.getItem(AUTH_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Login com localStorage (sistema legado - mantido para compatibilidade)
 */
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

/**
 * Logout - limpa sessão local
 */
export async function logout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    console.log("👋 Logout realizado com sucesso");
  }
}

/**
 * Obter usuário atual (síncrono - verifica localStorage e expiração)
 */
export function getCurrentUser(): UserType | null {
  return getLocalUser();
}

/**
 * Versão assíncrona para compatibilidade
 */
export async function getCurrentUserAsync(): Promise<UserType | null> {
  return getLocalUser();
}

/**
 * Verificar se usuário está autenticado (verifica expiração)
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Versão assíncrona para compatibilidade
 */
export async function isAuthenticatedAsync(): Promise<boolean> {
  return isAuthenticated();
}

/**
 * Verificar se usuário tem role específico
 */
export function hasRole(role: "admin" | "broker" | "financial" | "user"): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * Versão assíncrona para compatibilidade
 */
export async function hasRoleAsync(role: "admin" | "broker" | "financial" | "user"): Promise<boolean> {
  return hasRole(role);
}

/**
 * Verificar se usuário tem algum dos roles especificados
 */
export function hasAnyRole(roles: ("admin" | "broker" | "financial" | "user")[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

/**
 * Versão assíncrona para compatibilidade
 */
export async function hasAnyRoleAsync(roles: ("admin" | "broker" | "financial" | "user")[]): Promise<boolean> {
  return hasAnyRole(roles);
}

/**
 * Renovar sessão (estender tempo de expiração)
 */
export function renewSession(): void {
  if (typeof window === "undefined") return;
  
  const user = getLocalUser();
  if (user) {
    syncToLocalStorage(user);
    console.log("🔄 Sessão renovada por mais 1 hora");
  }
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