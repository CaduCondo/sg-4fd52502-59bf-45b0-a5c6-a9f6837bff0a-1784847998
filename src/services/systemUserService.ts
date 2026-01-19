import { SystemUser } from "@/types";
import { 
  getAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle, 
  getByField 
} from "@/lib/supabaseHelpers";

const TABLE = "system_users";

export async function getUsers(): Promise<SystemUser[]> {
  return getAll<SystemUser>(TABLE, { column: "name" });
}

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
  return updateSingle<SystemUser>(TABLE, id, updates);
}

export async function deleteUser(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}