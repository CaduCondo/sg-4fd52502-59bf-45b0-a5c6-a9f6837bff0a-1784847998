import { SystemUser } from "@/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle, 
  getByField 
} from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "system_users";

export async function getSystemUsers(): Promise<SystemUser[]> {
  return fetchAll<SystemUser>(TABLE);
}

export async function getUserById(id: string): Promise<SystemUser> {
  const user = await getSingle<SystemUser>(TABLE, id);
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export async function getUserByEmail(email: string): Promise<SystemUser | null> {
  return getByField<SystemUser>(TABLE, "email", email);
}

export async function createUser(userData: {
  name: string;
  email: string;
  phone?: string;
  username?: string;
  role: "admin" | "broker" | "financial";
  password: string;
  active: boolean;
}): Promise<SystemUser> {
  // NÃO remover o password - enviar todos os dados incluindo password
  return createSingle<SystemUser>(TABLE, userData as any);
}

export async function updateUser(id: string, user: Partial<SystemUser>): Promise<SystemUser> {
  // Converter camelCase → snake_case para campos do banco
  const dbUser: any = { ...user };
  
  // Mapear campos camelCase → snake_case
  if (user.birthDate !== undefined) {
    dbUser.birth_date = user.birthDate;
    delete dbUser.birthDate;
  }
  
  console.log("Atualizando usuário com ID:", id);
  console.log("Dados antes da atualização:", user);
  console.log("Dados após a conversão para snake_case:", dbUser);
  
  try {
    console.log("📝 Dados após conversão para snake_case:", dbUser);
    console.log("🚀 Chamando updateSingle...");
    
    const updatedUser = await updateSingle<SystemUser>(TABLE, id, dbUser);
    return updatedUser;
  } catch (error) {
    throw error;
  }
}

export async function deleteUser(id: string): Promise<void> {
  console.log(`🗑️ [SYSTEM-USER-SERVICE] Tentando deletar usuário: ${id}`);
  
  try {
    // Usar API Route do Next.js para deletar usuário completamente (System + Auth)
    const response = await fetch('/api/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: id })
    });

    console.log(`📝 [SYSTEM-USER-SERVICE] Status da resposta: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ [SYSTEM-USER-SERVICE] Erro ao deletar usuário via API:", errorData);
      throw new Error(errorData.error || `Falha ao deletar usuário: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📝 [SYSTEM-USER-SERVICE] Resposta da API:`, data);
    console.log("✅ [SYSTEM-USER-SERVICE] Usuário deletado com sucesso via API Route");
  } catch (error: any) {
    console.error("❌ [SYSTEM-USER-SERVICE] Erro ao invocar API Route:", error);
    console.error("❌ [SYSTEM-USER-SERVICE] Erro completo:", JSON.stringify(error, null, 2));
    
    // Fallback: tentar deletar apenas do system_users se a API falhar
    console.log("⚠️ [SYSTEM-USER-SERVICE] Tentando fallback: deletar apenas de system_users");
    try {
      // Primeiro, buscar o auth_user_id do usuário
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select('auth_user_id, email')
        .eq('id', id)
        .maybeSingle();

      if (userError) {
        console.error("❌ [SYSTEM-USER-SERVICE] Erro ao buscar dados do usuário:", userError);
        throw userError;
      }

      console.log("📝 [SYSTEM-USER-SERVICE] Dados do usuário encontrados:", userData);

      // Deletar de system_users (as dependências serão deletadas em cascata)
      await deleteSingle(TABLE, id);
      console.log("✅ [SYSTEM-USER-SERVICE] Usuário deletado via fallback (apenas system_users)");
      
      // Avisar que o usuário ainda pode existir no Auth
      if (userData?.auth_user_id) {
        console.warn("⚠️ [SYSTEM-USER-SERVICE] ATENÇÃO: Usuário ainda pode fazer login no Auth!");
        console.warn("⚠️ [SYSTEM-USER-SERVICE] auth_user_id:", userData.auth_user_id);
        console.warn("⚠️ [SYSTEM-USER-SERVICE] Para remover completamente, delete manualmente no Supabase Dashboard");
      }
    } catch (fallbackError) {
      console.error("❌ [SYSTEM-USER-SERVICE] Fallback também falhou:", fallbackError);
      throw fallbackError;
    }
  }
}

export async function unlockUser(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("system_users")
    .update({ active })
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
}

export async function resetPassword(userId: string): Promise<void> {
  // Resetar senha para "mudar123"
  const { error } = await supabase
    .from("system_users")
    .update({ password: "mudar123" })
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
}