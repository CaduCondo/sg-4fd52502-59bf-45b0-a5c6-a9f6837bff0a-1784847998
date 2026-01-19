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

// Alias for compatibility
export const getAll = getSystemUsers;

export async function getUserById(id: string): Promise<SystemUser> {
  const user = await getSingle<SystemUser>(TABLE, id);
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}

export async function getUserByEmail(email: string): Promise<SystemUser | null> {
  return getByField<SystemUser>(TABLE, "email", email);
}

export async function createUser(user: Omit<SystemUser, "id" | "created_at" | "updated_at">): Promise<SystemUser> {
  // Verificar se email já existe
  const existing = await getUserByEmail(user.email);
  if (existing) {
    throw new Error("Já existe um usuário com este email");
  }

  return createSingle<SystemUser>(TABLE, user);
}

export async function updateUser(id: string, updates: Partial<SystemUser>): Promise<SystemUser> {
  return updateSingle(TABLE, id, updates);
}

export async function deleteUser(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

export async function unlockUser(id: string): Promise<SystemUser> {
  return updateSingle<SystemUser>(TABLE, id, { active: true });
}

export async function resetPassword(id: string): Promise<void> {
  // Em um cenário real, isso dispararia um email de recuperação do Supabase Auth
  // ou atualizaria o hash da senha se fosse autenticação própria.
  // Por enquanto, vamos simular que foi feito.
  console.log(`Resetting password for user ${id}`);
  return Promise.resolve();
}