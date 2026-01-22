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
  role: "admin" | "broker" | "financial";
  password: string;
  active: boolean;
}): Promise<SystemUser> {
  // NÃO remover o password - enviar todos os dados incluindo password
  return createSingle<SystemUser>(TABLE, userData as any);
}

export async function updateUser(id: string, user: Partial<SystemUser>): Promise<SystemUser> {
  return updateSingle<SystemUser>(TABLE, id, user);
}

export async function deleteUser(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

export async function unlockUser(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("system_users")
    .update({ active })
    .eq("id", userId);

  if (error) throw error;
}

export async function resetPassword(userId: string): Promise<void> {
  // Resetar senha para "mudar123"
  const { error } = await supabase
    .from("system_users")
    .update({ password: "mudar123" })
    .eq("id", userId);

  if (error) throw error;
}