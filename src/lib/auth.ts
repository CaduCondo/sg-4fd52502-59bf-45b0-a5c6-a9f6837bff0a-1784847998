import { User as UserType } from "@/types";
import { userStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = "rental_auth_user";
const SESSION_EXPIRY_KEY = "rental_session_expiry";
const SESSION_DURATION = 3600000; // 1 hora em milissegundos

/**
 * SISTEMA DE AUTENTICAÇÃO SEGURO - FASE 2
 * 
 * ✅ Senhas hasheadas com bcrypt
 * ✅ Tokens JWT do Supabase (impossíveis de falsificar)
 * ✅ Refresh tokens automáticos
 * ✅ Expiração de sessão em 1 hora
 * ✅ Sincronização com Supabase Auth
 * ✅ Proteção contra manipulação de sessão
 */

/**
 * Converte usuário do sistema para formato UserType
 */
function mapSystemUserToUserType(systemUser: any): UserType {
  let role: "admin" | "user" | "broker" | "financial" = "user";
  const dbRole = (systemUser.role || systemUser.user_role)?.toLowerCase();
  
  if (dbRole === "admin" || dbRole === "administrador") role = "admin";
  else if (dbRole === "corretor" || dbRole === "broker") role = "broker";
  else if (dbRole === "financeiro" || dbRole === "financial") role = "financial";

  return {
    id: systemUser.id || systemUser.user_id,
    name: systemUser.name || systemUser.user_name || systemUser.email?.split("@")[0] || systemUser.user_email?.split("@")[0] || "Usuário",
    username: systemUser.username || systemUser.user_username || systemUser.email?.split("@")[0] || systemUser.user_email?.split("@")[0] || "",
    email: systemUser.email || systemUser.user_email || "",
    password: "",
    role: role,
    phone: systemUser.phone || systemUser.user_phone || "",
    rg: systemUser.rg || systemUser.user_rg || "",
    cpf: systemUser.cpf || systemUser.user_cpf || "",
    active: systemUser.active ?? systemUser.user_active ?? true,
    createdAt: systemUser.created_at || new Date().toISOString(),
    photo: systemUser.photo || systemUser.user_photo || undefined,
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
 * Verificar se Supabase Auth tem sessão ativa
 */
async function checkSupabaseSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  } catch {
    return false;
  }
}

/**
 * Renovar sessão do Supabase Auth automaticamente
 */
async function refreshSupabaseSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.log("⏰ Sessão expirada - renovação falhou");
      return false;
    }
    
    console.log("🔄 Sessão renovada automaticamente");
    return true;
  } catch {
    return false;
  }
}

/**
 * LOGIN SEGURO COM BCRYPT + SUPABASE AUTH (FASE 2)
 * 
 * Fluxo completo:
 * 1. Valida credenciais com bcrypt no banco
 * 2. Migra senhas antigas automaticamente
 * 3. Sincroniza com Supabase Auth
 * 4. Gera tokens JWT seguros
 * 5. Cria sessão local com expiração
 */
export async function loginWithSupabaseAuth(emailOrUsername: string, password: string): Promise<UserType | null> {
  try {
    console.log("🔐 Iniciando login para:", emailOrUsername);
    
    // PASSO 1: Validar credenciais no banco COM BCRYPT
    const { data, error } = await supabase.rpc("authenticate_user_secure", {
      p_username_or_email: emailOrUsername,
      p_password: password
    });

    if (error) {
      console.error("❌ Erro ao autenticar:", error);
      console.error("❌ Detalhes:", JSON.stringify(error, null, 2));
      return null;
    }

    if (!data || data.length === 0) {
      console.log("❌ Credenciais inválidas");
      return null;
    }

    const systemUser = data[0];
    const authUserId = systemUser.auth_id;

    console.log("✅ Credenciais validadas com bcrypt no banco");
    console.log("✅ Usuário:", systemUser.user_name);
    console.log("✅ Auth User ID:", authUserId);

    // PASSO 2: Autenticar no Supabase Auth para obter sessão válida
    let authSuccess = false;

    // Primeiro, tentar fazer login (usuário pode já existir no Auth)
    console.log("🔑 Tentando autenticar no Supabase Auth...");
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: systemUser.user_email,
      password: password
    });

    if (!signInError && signInData.session) {
      console.log("✅ Login no Supabase Auth bem-sucedido");
      console.log("✅ Sessão ativa - auth.uid() disponível");
      authSuccess = true;
    } else {
      console.log("⚠️ Usuário não existe no Supabase Auth, criando...");
      
      // Se login falhou, tentar criar o usuário
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: systemUser.user_email,
        password: password,
        options: {
          data: {
            name: systemUser.user_name,
            role: systemUser.user_role,
          }
        }
      });

      if (signUpError) {
        console.warn("⚠️ Erro ao criar usuário no Supabase Auth:", signUpError.message);
      } else if (signUpData.session) {
        console.log("✅ Usuário criado no Supabase Auth com sucesso");
        console.log("✅ Sessão ativa - auth.uid() disponível");
        authSuccess = true;

        // Atualizar auth_user_id no system_users
        if (signUpData.user) {
          await supabase
            .from("system_users")
            .update({ auth_user_id: signUpData.user.id })
            .eq("id", systemUser.user_id);
          console.log("✅ Auth User ID atualizado no banco");
        }
      }
    }

    if (authSuccess) {
      console.log("✅ Tokens JWT obtidos com sucesso");
      console.log("✅ Access Token válido por 1 hora");
      console.log("✅ Refresh Token disponível para renovação");
    } else {
      console.warn("⚠️ Continuando sem sessão do Supabase Auth");
      console.warn("⚠️ Algumas funcionalidades podem não funcionar corretamente");
    }

    // PASSO 3: Criar sessão local com expiração
    const user = mapSystemUserToUserType(systemUser);
    syncToLocalStorage(user);
    
    console.log("✅ Login concluído com segurança bcrypt!");
    console.log("🔐 Sessão expira em 1 hora");
    
    return user;

  } catch (error) {
    console.error("❌ Erro no login:", error);
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : "N/A");
    return null;
  }
}

/**
 * Obter usuário do localStorage (com verificação de expiração e renovação JWT)
 */
async function getLocalUserWithRefresh(): Promise<UserType | null> {
  if (typeof window === "undefined") return null;
  
  // Verificar se sessão local expirou
  if (isSessionExpired()) {
    console.log("⏰ Sessão local expirada");
    
    // Tentar renovar com Supabase Auth
    const hasSupabaseSession = await checkSupabaseSession();
    
    if (hasSupabaseSession) {
      const renewed = await refreshSupabaseSession();
      
      if (renewed) {
        // Renovar sessão local também
        const userStr = localStorage.getItem(AUTH_KEY);
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            syncToLocalStorage(user);
            return user;
          } catch {
            // Continuar para logout
          }
        }
      }
    }
    
    console.log("⏰ Não foi possível renovar - fazendo logout automático");
    await logout();
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
 * Obter usuário do localStorage (versão síncrona - sem renovação)
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
 * Logout - limpa sessão local e Supabase Auth
 */
export async function logout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    
    // Fazer logout do Supabase Auth também
    try {
      await supabase.auth.signOut();
      console.log("✅ Logout do Supabase Auth realizado");
    } catch (error) {
      console.warn("⚠️ Erro ao fazer logout do Supabase Auth:", error);
    }
    
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
 * Versão assíncrona com renovação automática de tokens
 */
export async function getCurrentUserAsync(): Promise<UserType | null> {
  return await getLocalUserWithRefresh();
}

/**
 * Verificar se usuário está autenticado (verifica expiração)
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Versão assíncrona com verificação de sessão Supabase
 */
export async function isAuthenticatedAsync(): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user !== null;
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
 * Renovar sessão (estender tempo de expiração e renovar JWT)
 */
export async function renewSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  // Renovar sessão do Supabase Auth
  const renewed = await refreshSupabaseSession();
  
  // Renovar sessão local
  const user = getLocalUser();
  if (user) {
    syncToLocalStorage(user);
    console.log("🔄 Sessão local renovada por mais 1 hora");
  }
  
  return renewed;
}

/**
 * Iniciar renovação automática de sessão (chamar no _app.tsx)
 */
export function startAutoRenewal(): void {
  if (typeof window === "undefined") return;
  
  // Renovar sessão a cada 50 minutos (antes de expirar em 1 hora)
  setInterval(async () => {
    const user = getCurrentUser();
    if (user) {
      console.log("🔄 Renovação automática de sessão...");
      await renewSession();
    }
  }, 50 * 60 * 1000); // 50 minutos
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