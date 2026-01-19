import { Tenant } from "@/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "tenants";

export async function getAllTenants(): Promise<Tenant[]> {
  return fetchAll<Tenant>(TABLE);
}

// Alias
export const getAll = getAllTenants;

export async function getTenantById(id: string): Promise<Tenant> {
  return getSingle<Tenant>(TABLE, id);
}

// Alias
export const getById = getTenantById;

export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  return createSingle<Tenant>(TABLE, data);
}

// Alias
export const create = createTenant;

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  return updateSingle<Tenant>(TABLE, id, data);
}

// Alias
export const update = updateTenant;

export async function deleteTenant(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deleteTenant;