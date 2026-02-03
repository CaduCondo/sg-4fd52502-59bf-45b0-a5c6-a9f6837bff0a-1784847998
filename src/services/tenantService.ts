import { Tenant } from "@/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "tenants";

// Transform frontend camelCase to database snake_case
function toDatabase(data: Partial<Tenant>): any {
  const dbData: any = {};
  
  if (data.name !== undefined) dbData.name = data.name;
  if (data.email !== undefined) dbData.email = data.email;
  if (data.phone !== undefined) dbData.phone = data.phone;
  if (data.status !== undefined) dbData.status = data.status;
  if (data.rg !== undefined) dbData.rg = data.rg;
  
  // Handle document_type (camelCase to snake_case)
  if (data.documentType !== undefined) {
    dbData.document_type = data.documentType;
  } else if (data.document_type !== undefined) {
    dbData.document_type = data.document_type;
  }
  
  // Handle document field (stores CPF or CNPJ value)
  if (data.document !== undefined) {
    dbData.document = data.document;
  }
  
  // REMOVED: cpf and cnpj columns don't exist in database
  // All values go to 'document' field based on 'document_type'
  
  return dbData;
}

// Transform database snake_case to frontend camelCase
function fromDatabase(data: any): Tenant {
  return {
    ...data,
    documentType: data.document_type || data.documentType,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
    // Map document field to cpf or cnpj for frontend compatibility
    cpf: data.document_type === "cpf" ? data.document : data.cpf,
    cnpj: data.document_type === "cnpj" ? data.document : data.cnpj,
  };
}

export async function getAllTenants(): Promise<Tenant[]> {
  const data = await fetchAll<any>(TABLE);
  return data.map(fromDatabase);
}

// Alias
export const getAll = getAllTenants;

export async function getTenantById(id: string): Promise<Tenant> {
  const data = await getSingle<any>(TABLE, id);
  return fromDatabase(data);
}

// Alias
export const getById = getTenantById;

export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  const dbData = toDatabase(data);
  const result = await createSingle<any>(TABLE, dbData);
  return fromDatabase(result);
}

// Alias
export const create = createTenant;

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const dbData = toDatabase(data);
  const result = await updateSingle<any>(TABLE, id, dbData);
  return fromDatabase(result);
}

// Alias
export const update = updateTenant;

export async function deleteTenant(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deleteTenant;

export async function getActive(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, status")
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("Error fetching active tenants:", error);
    throw error;
  }

  return data || [];
}