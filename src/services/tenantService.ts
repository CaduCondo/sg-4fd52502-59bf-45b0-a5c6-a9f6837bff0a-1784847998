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
  
  // Address fields - map cep to zip_code
  if (data.cep !== undefined) dbData.zip_code = data.cep;
  if (data.street !== undefined) dbData.street = data.street;
  if (data.number !== undefined) dbData.number = data.number;
  if (data.complement !== undefined) dbData.complement = data.complement;
  if (data.neighborhood !== undefined) dbData.neighborhood = data.neighborhood;
  if (data.city !== undefined) dbData.city = data.city;
  if (data.state !== undefined) dbData.state = data.state;
  
  // Document type and document handling
  if (data.documentType !== undefined) dbData.document_type = data.documentType;
  if (data.document_type !== undefined) dbData.document_type = data.document_type;
  
  // Handle document field based on document_type
  const docType = data.documentType || data.document_type;
  if (docType === "cpf" && data.cpf) {
    dbData.document = data.cpf;
  } else if (docType === "cnpj" && data.cnpj) {
    dbData.document = data.cnpj;
  } else if (data.document) {
    dbData.document = data.document;
  }
  
  // Only set cpf field if document_type is cpf - for backward compatibility
  // In the unified model, document_type + document hold everything
  // cpf column is kept for queries but should mirror document when type=cpf
  if (docType === "cpf" && data.cpf) {
    dbData.cpf = data.cpf;
  }
  
  return dbData;
}

// Transform database snake_case to frontend camelCase
function fromDatabase(data: any): Tenant {
  const transformed = {
    ...data,
    documentType: data.document_type || (data.cpf ? "cpf" : data.document ? "cnpj" : "cpf"),
    document_type: data.document_type || (data.cpf ? "cpf" : data.document ? "cnpj" : "cpf"),
    cpf: data.document_type === "cpf" ? data.document : (data.cpf || ""),
    cnpj: data.document_type === "cnpj" ? data.document : "",
    rg: data.rg,
    cep: data.zip_code,
    street: data.street,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
  };
  
  console.log("🔄 tenantService.fromDatabase - Transformação:", {
    input: data,
    output: transformed
  });
  
  return transformed;
}

export async function getAllTenants(): Promise<Tenant[]> {
  console.log("🔍 === FETCHING ALL TENANTS (DEBUG) ===");
  
  const data = await fetchAll<any>(TABLE);
  
  console.log(`📊 Total tenants fetched from database: ${data.length}`);
  
  // Group by status for debugging
  const statusCount = data.reduce((acc: any, tenant: any) => {
    const status = tenant.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  console.log("📊 Tenants by status:", statusCount);
  
  // Check for duplicates by document
  const documents = data.map((t: any) => t.document).filter(Boolean);
  const uniqueDocuments = new Set(documents);
  if (documents.length !== uniqueDocuments.size) {
    console.warn("⚠️ WARNING: Duplicate documents found in tenants!");
    console.warn(`Total documents: ${documents.length}, Unique: ${uniqueDocuments.size}`);
  }
  
  const tenants = data.map(fromDatabase);
  console.log("✅ Tenants mapped successfully");
  
  return tenants;
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

  // Casting para Tenant[] pois estamos retornando apenas os campos necessários para a UI
  // para otimização de performance, conforme solicitado
  return (data || []) as unknown as Tenant[];
}