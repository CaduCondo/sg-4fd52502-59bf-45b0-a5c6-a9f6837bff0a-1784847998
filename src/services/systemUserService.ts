import { SystemUser } from "@/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle, 
  getByField 
} from "@/lib/supabaseHelpers";

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

export async function createUser(user: Omit<SystemUser, "id" | "created_at" | "updated_at"> & { password?: string }): Promise<SystemUser> {
  // In a real app, this would create the auth user too
  // For now we just create the record in public.users
  const { password, ...userData } = user;
  return createSingle<SystemUser>(TABLE, userData as any);
}

export async function updateUser(id: string, user: Partial<SystemUser>): Promise<SystemUser> {
  return updateSingle<SystemUser>(TABLE, id, user);
}

export async function deleteUser(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

export async function unlockUser(id: string, active: boolean): Promise<SystemUser> {
  return updateSingle<SystemUser>(TABLE, id, { active });
}

export async function resetPassword(id: string): Promise<void> {
  // Em um cenário real, isso dispararia um email de recuperação do Supabase Auth
  // ou atualizaria o hash da senha se fosse autenticação própria.
  // Por enquanto, vamos simular que foi feito.
  console.log(`Resetting password for user ${id}`);
  return Promise.resolve();
}