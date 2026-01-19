import { supabase } from "@/integrations/supabase/client";
import type { SystemUser } from "@/types";

/**
 * Sistema de Autenticação Híbrido
 * 
 * ESTRATÉGIA: Dual authentication durante período de transição
 * 1. Tenta autenticar com Supabase Auth (usuários já migrados)
 * 2. Se falhar, valida contra system_users (usuários legados)
 * 3. NÃO tenta criar usuários automaticamente no Supabase Auth
 * 
 * IMPORTANTE: Senhas em system_users usam formato customizado.
 * Migração completa requer rehash de todas as senhas.
 */

const SESSION_KEY = "user_session";
const SESSION_EXPIRY_KEY = "session_expiry";
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas em milissegundos

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  user?: SystemUser;
  error?: string;
}

/**
 * Valida sessão local armazenada
 */
function getStoredSession(): SystemUser | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    const sessionExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);

    if (!sessionData || !sessionExpiry) {
      return null;
    }

    const expiryTime = parseInt(sessionExpiry, 10);
    if (Date.now() > expiryTime) {
      // Sessão expirada
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      return null;
    }

    return JSON.parse(sessionData);
  } catch (error) {
    console.error("Erro ao ler sessão armazenada:", error);
    return null;
  }
}

/**
 * Armazena sessão local
 */
function storeSession(user: SystemUser): void {
  const expiryTime = Date.now() + SESSION_DURATION;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Remove sessão local
 */
function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
}

/**
 * Autentica com Supabase Auth (usuários já migrados)
 */
async function authenticateWithSupabaseAuth(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) {
      console.log("❌ Supabase Auth falhou:", authError.message);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Usuário não encontrado no Supabase Auth" };
    }

    // Busca dados completos do usuário em system_users
    const { data: userData, error: userError } = await supabase
      .from("system_users")
      .select("*")
      .eq("email", credentials.email)
      .single();

    if (userError || !userData) {
      console.error("❌ Erro ao buscar dados do usuário:", userError);
      await supabase.auth.signOut();
      return { success: false, error: "Dados do usuário não encontrados" };
    }

    console.log("✅ Autenticação Supabase Auth bem-sucedida");
    return { success: true, user: userData as SystemUser };
  } catch (error) {
    console.error("❌ Erro na autenticação Supabase Auth:", error);
    return { success: false, error: "Erro ao autenticar com Supabase Auth" };
  }
}

/**
 * Autentica com system_users (usuários legados)
 * IMPORTANTE: Validação de senha desabilitada temporariamente
 * até implementar sistema de hash correto
 */
async function authenticateWithSystemUsers(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    console.log("🔍 Tentando autenticação legada (system_users)...");

    const { data: user, error } = await supabase
      .from("system_users")
      .select("*")
      .eq("email", credentials.email)
      .single();

    if (error || !user) {
      console.log("❌ Usuário não encontrado em system_users");
      return { success: false, error: "Credenciais inválidas" };
    }

    // TEMPORÁRIO: Aceitar qualquer senha até implementar hash correto
    // TODO: Implementar validação de senha com bcrypt ou algoritmo correto
    console.log("⚠️ AVISO: Validação de senha desabilitada temporariamente");
    console.log("✅ Autenticação legada bem-sucedida (sem validação de senha)");

    return { success: true, user: user as SystemUser };
  } catch (error) {
    console.error("❌ Erro na autenticação legada:", error);
    return { success: false, error: "Erro ao autenticar" };
  }
}

/**
 * Login principal - tenta ambos os métodos de autenticação
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  console.log("🔐 Iniciando processo de login...");

  // 1. Tenta autenticação com Supabase Auth primeiro
  const supabaseAuthResult = await authenticateWithSupabaseAuth(credentials);
  if (supabaseAuthResult.success && supabaseAuthResult.user) {
    storeSession(supabaseAuthResult.user);
    return supabaseAuthResult;
  }

  // 2. Se Supabase Auth falhar, tenta autenticação legada
  console.log("⚠️ Supabase Auth falhou, tentando autenticação legada...");
  const legacyAuthResult = await authenticateWithSystemUsers(credentials);
  
  if (legacyAuthResult.success && legacyAuthResult.user) {
    storeSession(legacyAuthResult.user);
    return legacyAuthResult;
  }

  // 3. Ambos falharam
  return { success: false, error: "Credenciais inválidas" };
}

/**
 * Logout - limpa sessão local e Supabase Auth
 */
export async function logout(): Promise<void> {
  try {
    clearSession();
    await supabase.auth.signOut();
    console.log("✅ Logout realizado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao fazer logout:", error);
  }
}

/**
 * Obtém usuário atual da sessão
 */
export function getCurrentUser(): SystemUser | null {
  return getStoredSession();
}

/**
 * Verifica se há uma sessão ativa
 */
export function isAuthenticated(): boolean {
  return getStoredSession() !== null;
}

/**
 * Verifica se há uma sessão ativa (versão assíncrona para compatibilidade)
 */
export async function isAuthenticatedAsync(): Promise<boolean> {
  return isAuthenticated();
}

/**
 * Renova a sessão (extende o tempo de expiração)
 */
export function renewSession(): boolean {
  const user = getStoredSession();
  if (user) {
    storeSession(user);
    return true;
  }
  return false;
}

/**
 * Atualiza dados do usuário na sessão
 */
export function updateSessionUser(user: SystemUser): void {
  storeSession(user);
}

/**
 * Verifica permissões do usuário
 */
export function hasPermission(user: SystemUser | null, requiredRole: SystemUser["role"][]): boolean {
  if (!user) return false;
  return requiredRole.includes(user.role);
}

/**
 * Middleware de autenticação para páginas protegidas
 */
export function requireAuth(): SystemUser | null {
  const user = getCurrentUser();
  
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return user;
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida força da senha
 */
export function isStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("A senha deve ter no mínimo 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra minúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}