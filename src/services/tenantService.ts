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

function toDatabase(data: Partial<Tenant>): any {
  const dbData: any = {};
  
  if (data.name !== undefined) dbData.name = data.name;
  if (data.email !== undefined) dbData.email = data.email;
  if (data.phone !== undefined) dbData.phone = data.phone;
  if (data.status !== undefined) dbData.status = data.status;
  if (data.rg !== undefined) dbData.rg = data.rg;
  
  if (data.cep !== undefined) dbData.zip_code = data.cep;
  if (data.street !== undefined) dbData.street = data.street;
  if (data.number !== undefined) dbData.number = data.number;
  if (data.complement !== undefined) dbData.complement = data.complement;
  if (data.neighborhood !== undefined) dbData.neighborhood = data.neighborhood;
  if (data.city !== undefined) dbData.city = data.city;
  if (data.state !== undefined) dbData.state = data.state;
  
  if (data.documentType !== undefined) dbData.document_type = data.documentType;
  if (data.document_type !== undefined) dbData.document_type = data.document_type;
  
  const docType = data.documentType || data.document_type;
  if (docType === "cpf" && data.cpf) {
    dbData.document = data.cpf;
  } else if (docType === "cnpj" && data.cnpj) {
    dbData.document = data.cnpj;
  } else if (data.document) {
    dbData.document = data.document;
  }
  
  if (docType === "cpf" && data.cpf) {
    dbData.cpf = data.cpf;
  }
  
  return dbData;
}

function fromDatabase(data: any): Tenant {
  return {
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
}

export async function getAllTenants(): Promise<Tenant[]> {
  console.log("🔄 [tenantService] Buscando inquilinos e suas locações...");
  
  // Buscar todos os inquilinos
  const tenantsData = await fetchAll<any>(TABLE);
  console.log(`📊 [tenantService] ${tenantsData.length} inquilinos encontrados`);
  
  // Buscar todas as locações para calcular status correto
  const { data: rentalsData, error: rentalsError } = await supabase
    .from("rentals")
    .select("tenant_id, status") as any;
  
  if (rentalsError) {
    console.error("❌ [tenantService] Erro ao buscar locações:", rentalsError);
  } else {
    console.log(`📊 [tenantService] ${(rentalsData || []).length} locações encontradas`);
  }
  
  // Criar mapa de locações por inquilino
  const rentalsMap = new Map<string, string[]>();
  (rentalsData || []).forEach((rental: any) => {
    if (!rentalsMap.has(rental.tenant_id)) {
      rentalsMap.set(rental.tenant_id, []);
    }
    rentalsMap.get(rental.tenant_id)!.push(rental.status);
  });
  
  console.log(`📊 [tenantService] Mapa de locações criado com ${rentalsMap.size} inquilinos`);
  
  // Calcular status correto para cada inquilino
  const result = tenantsData.map((data) => {
    const tenant = fromDatabase(data);
    const rentalStatuses = rentalsMap.get(tenant.id) || [];
    
    // Calcular status baseado nas locações
    let calculatedStatus: "new" | "active" | "inactive" | "rented" | "late" | "debt";
    
    if (rentalStatuses.length === 0) {
      // Nunca teve contrato - status "new"
      calculatedStatus = "new";
    } else if (rentalStatuses.includes("active")) {
      // Tem pelo menos um contrato ativo - status "rented" (Locatário)
      calculatedStatus = "rented";
    } else {
      // Teve contratos mas nenhum ativo (todos cancelled/terminated) - status "inactive"
      calculatedStatus = "inactive";
    }
    
    return {
      ...tenant,
      status: calculatedStatus,
    };
  });
  
  // Log de todos os status únicos encontrados
  const uniqueStatuses = [...new Set(result.map(t => t.status))];
  console.log(`✅ [tenantService] Status únicos encontrados:`, uniqueStatuses);
  console.log(`📊 [tenantService] Resumo: ${result.filter(t => t.status === "new").length} novos, ${result.filter(t => t.status === "rented").length} locatários, ${result.filter(t => t.status === "inactive").length} inativos`);
  
  return result;
}

export const getAll = getAllTenants;

export async function getTenantById(id: string): Promise<Tenant> {
  const data = await getSingle<any>(TABLE, id);
  return fromDatabase(data);
}

export const getById = getTenantById;

export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  const dbData = toDatabase(data);
  const result = await createSingle<any>(TABLE, dbData);
  return fromDatabase(result);
}

export const create = createTenant;

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const dbData = toDatabase(data);
  const result = await updateSingle<any>(TABLE, id, dbData);
  return fromDatabase(result);
}

export const update = updateTenant;

export async function deleteTenant(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

export const remove = deleteTenant;

export async function getActive(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, status")
    .eq("status", "active")
    .order("name");

  if (error) throw error;

  return (data || []) as unknown as Tenant[];
}