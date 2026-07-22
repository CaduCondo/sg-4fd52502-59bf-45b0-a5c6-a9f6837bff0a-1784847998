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
  console.log("🔄 [tenantService.toDatabase] Dados recebidos:", data);
  
  const dbData: any = {};
  
  if (data.name !== undefined) dbData.name = data.name;
  if (data.email !== undefined) dbData.email = data.email;
  if (data.phone !== undefined) dbData.phone = data.phone;
  
  // 🔥 MAPEAMENTO DE STATUS - banco só aceita: active, inactive, rented
  // Frontend usa "new" mas banco usa "active"
  if (data.status !== undefined) {
    const statusMap: Record<string, string> = {
      "new": "active",      // Inquilino novo = ativo no banco
      "active": "active",   // Manter active
      "rented": "rented",   // Inquilino locatário
      "inactive": "inactive" // Inquilino inativo
    };
    dbData.status = statusMap[data.status] || "active";
    console.log(`📋 [tenantService.toDatabase] Status mapeado: ${data.status} → ${dbData.status}`);
  }
  
  if (data.rg !== undefined && data.rg !== "") dbData.rg = data.rg;
  
  // Campos adicionais
  if (data.occupation !== undefined && data.occupation !== "") dbData.occupation = data.occupation;
  if (data.maritalStatus !== undefined && data.maritalStatus !== "") dbData.marital_status = data.maritalStatus;
  if (data.marital_status !== undefined && data.marital_status !== "") dbData.marital_status = data.marital_status;
  if (data.monthlyIncome !== undefined && data.monthlyIncome !== "") dbData.monthly_income = data.monthlyIncome;
  if (data.monthly_income !== undefined && data.monthly_income !== "") dbData.monthly_income = data.monthly_income;
  
  if (data.cep !== undefined && data.cep !== "") dbData.zip_code = data.cep;
  if (data.street !== undefined && data.street !== "") dbData.street = data.street;
  if (data.number !== undefined && data.number !== "") dbData.number = data.number;
  if (data.complement !== undefined && data.complement !== "") dbData.complement = data.complement;
  if (data.neighborhood !== undefined && data.neighborhood !== "") dbData.neighborhood = data.neighborhood;
  if (data.city !== undefined && data.city !== "") dbData.city = data.city;
  if (data.state !== undefined && data.state !== "") dbData.state = data.state;
  
  // Determinar tipo de documento
  const docType = data.documentType || data.document_type || "cpf";
  dbData.document_type = docType;
  
  console.log("📋 [tenantService.toDatabase] Tipo de documento:", docType);
  console.log("📋 [tenantService.toDatabase] CPF:", data.cpf);
  console.log("📋 [tenantService.toDatabase] CNPJ:", data.cnpj);
  console.log("📋 [tenantService.toDatabase] Document:", data.document);
  
  // Definir o campo document baseado no tipo
  if (docType === "cpf") {
    const cpfValue = data.cpf || data.document || "";
    if (cpfValue && cpfValue !== "") {
      dbData.document = cpfValue;
      dbData.cpf = cpfValue;
      console.log("✅ [tenantService.toDatabase] CPF definido:", cpfValue);
    } else {
      console.warn("⚠️ [tenantService.toDatabase] CPF não definido!");
    }
  } else if (docType === "cnpj") {
    const cnpjValue = data.cnpj || data.document || "";
    if (cnpjValue && cnpjValue !== "") {
      dbData.document = cnpjValue;
      console.log("✅ [tenantService.toDatabase] CNPJ definido:", cnpjValue);
    } else {
      console.warn("⚠️ [tenantService.toDatabase] CNPJ não definido!");
    }
  } else if (data.document && data.document !== "") {
    // Fallback para campo genérico 'document'
    dbData.document = data.document;
    const cleanDoc = data.document.replace(/\D/g, "");
    dbData.document_type = cleanDoc.length === 11 ? "cpf" : "cnpj";
    if (cleanDoc.length === 11) {
      dbData.cpf = data.document;
    }
    console.log("✅ [tenantService.toDatabase] Document genérico definido:", data.document);
  }
  
  console.log("📤 [tenantService.toDatabase] Dados para banco:", dbData);
  
  return dbData;
}

function fromDatabase(data: any): Tenant {
  // 🔥 MAPEAMENTO REVERSO - banco retorna active/inactive/rented
  // Converter "active" para "new" apenas se o inquilino NUNCA teve locações
  // (será calculado na função getAllTenants/getActive)
  return {
    ...data,
    documentType: data.document_type || (data.cpf ? "cpf" : data.document ? "cnpj" : "cpf"),
    document_type: data.document_type || (data.cpf ? "cpf" : data.document ? "cnpj" : "cpf"),
    cpf: data.document_type === "cpf" ? data.document : (data.cpf || ""),
    cnpj: data.document_type === "cnpj" ? data.document : "",
    rg: data.rg,
    occupation: data.occupation || "",
    maritalStatus: data.marital_status || "",
    marital_status: data.marital_status || "",
    monthlyIncome: data.monthly_income || "",
    monthly_income: data.monthly_income || "",
    cep: data.zip_code,
    street: data.street,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
    status: data.status, // Manter status do banco (será recalculado em getAllTenants)
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
    let calculatedStatus: "new" | "rented" | "inactive";
    
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

export const updateTenant = async (id: string, data: Partial<Tenant>): Promise<Tenant | null> => {
  try {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.cpf !== undefined) updateData.cpf = data.cpf;
    if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
    if (data.rg !== undefined) updateData.rg = data.rg;
    if (data.document !== undefined) updateData.document = data.document;
    if (data.documentType !== undefined) updateData.document_type = data.documentType;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.maritalStatus !== undefined) updateData.marital_status = data.maritalStatus;
    if (data.monthlyIncome !== undefined) updateData.monthly_income = data.monthlyIncome;
    if (data.cep !== undefined) updateData.zip_code = data.cep;
    if (data.street !== undefined) updateData.street = data.street;
    if (data.number !== undefined) updateData.number = data.number;
    if (data.complement !== undefined) updateData.complement = data.complement;
    if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: tenant, error } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar inquilino:", error);
      throw error;
    }

    return tenant ? fromDatabase(tenant) : null;
  } catch (error) {
    console.error("Erro ao atualizar inquilino:", error);
    throw error;
  }
};

export const update = updateTenant;

export async function deleteTenant(id: string): Promise<void> {
  // 🔒 GATILHO DE SEGURANÇA: Verificar se o inquilino tem locações ativas
  const { data: activeRentals, error: rentalError } = await supabase
    .from("rentals")
    .select("id, status")
    .eq("tenant_id", id)
    .eq("status", "active");

  if (rentalError) {
    console.error("❌ Erro ao verificar locações:", rentalError);
    throw rentalError;
  }

  if (activeRentals && activeRentals.length > 0) {
    throw new Error(
      "Não é possível deletar este inquilino porque ele está como locatário em uma locação ativa. " +
      "Encerre ou rescinda o contrato de locação antes de deletar o inquilino."
    );
  }

  return deleteSingle(TABLE, id);
}

export const remove = deleteTenant;

export async function getActive(): Promise<Tenant[]> {
  console.log("🔄 [tenantService.getActive] Buscando inquilinos disponíveis (apenas status 'new')...");
  
  // Buscar todos os inquilinos
  const { data: tenantsData, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, name, status")
    .order("name");

  if (tenantsError) {
    console.error("❌ [tenantService.getActive] Erro ao buscar inquilinos:", tenantsError);
    throw tenantsError;
  }

  console.log(`📊 [tenantService.getActive] ${(tenantsData || []).length} inquilinos encontrados`);
  
  // Buscar TODAS as locações (ativas, canceladas, terminadas) para calcular status
  const { data: rentalsData, error: rentalsError } = await supabase
    .from("rentals")
    .select("tenant_id, status") as any;
  
  if (rentalsError) {
    console.error("❌ [tenantService.getActive] Erro ao buscar locações:", rentalsError);
  }
  
  // Criar mapa de locações por inquilino
  const rentalsMap = new Map<string, string[]>();
  (rentalsData || []).forEach((rental: any) => {
    if (!rentalsMap.has(rental.tenant_id)) {
      rentalsMap.set(rental.tenant_id, []);
    }
    rentalsMap.get(rental.tenant_id)!.push(rental.status);
  });
  
  console.log(`📊 [tenantService.getActive] Mapa de locações criado com ${rentalsMap.size} inquilinos que já tiveram/têm locações`);
  
  // Retornar APENAS inquilinos que NUNCA tiveram locações (status "new")
  const newTenants = (tenantsData || []).filter(
    (tenant: any) => !rentalsMap.has(tenant.id) // Nunca teve locação = status "new"
  );
  
  console.log(`✅ [tenantService.getActive] ${newTenants.length} inquilinos com status "new" (nunca tiveram locações)`);
  
  return newTenants as unknown as Tenant[];
}