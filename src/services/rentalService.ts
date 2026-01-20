import { Rental } from "@/types";
import { 
  createSingle, 
  updateSingle, 
  deleteSingle
} from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "rentals";

// Mapper
function mapRentalFromDB(data: any): Rental {
  return {
    ...data,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    rentAmount: data.rent_amount || data.monthly_rent, // fallback logic
    depositAmount: data.deposit_amount,
    paymentDay: data.payment_day,
    contractUrl: data.contract_url,
    autoRenew: data.auto_renew,
    adminFee: data.admin_fee,
    dueDate: data.due_date,
    receivedDate: data.received_date,
    paidAmount: data.paid_amount,
    referenceMonth: data.reference_month,
    referenceYear: data.reference_year,
    
    // Compatibility
    monthlyRent: data.monthly_rent || data.rent_amount,
    isActive: data.is_active,
    hasGarage: data.has_garage,
    garageValue: data.garage_value,
    contractAttachments: data.contract_attachments,
    pixCode: data.pix_code,
  };
}

// Reverse mapper
function mapRentalToDB(data: Partial<Rental>): any {
  const dbData: any = {};
  
  if (data.propertyId) dbData.property_id = data.propertyId;
  if (data.tenantId) dbData.tenant_id = data.tenantId;
  if (data.startDate) dbData.start_date = data.startDate;
  if (data.endDate !== undefined) dbData.end_date = data.endDate;
  // Mapear rentAmount para monthly_rent (nome da coluna no banco)
  if (data.rentAmount !== undefined) dbData.monthly_rent = data.rentAmount;
  else if (data.monthlyRent !== undefined) dbData.monthly_rent = data.monthlyRent;
  
  // Tratar deposit (banco é text)
  if (data.depositAmount !== undefined) dbData.deposit = String(data.depositAmount);
  else if (data.deposit !== undefined) dbData.deposit = data.deposit;
  
  if (data.paymentDay !== undefined) dbData.payment_day = data.paymentDay;
  // contract_url não existe no schema fornecido, mas pode ser útil manter se for adicionado depois. 
  // O erro original era sobre endDate, mas vamos limpar o que não existe.
  // contract_url removido pois não aparece no schema.
  
  // auto_renew não existe no schema fornecido.
  
  // admin_fee não existe no schema fornecido.
  
  if (data.value !== undefined) dbData.value = data.value;
  if (data.isActive !== undefined) dbData.is_active = data.isActive;
  if (data.hasGarage !== undefined) dbData.has_garage = data.hasGarage;
  if (data.garageValue !== undefined) dbData.garage_value = data.garageValue;
  
  // Mapear attachments para ambos os campos JSONB por segurança, ou preferir contract_attachments
  if (data.attachments) {
    dbData.contract_attachments = data.attachments; 
    dbData.attachments = data.attachments;
  }
  
  if (data.pixCode) dbData.pix_code = data.pixCode;
  
  // location_id removido pois não existe na tabela rentals

  return dbData;
}

export async function getAllRentals(): Promise<Rental[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      property:properties(*),
      tenant:tenants(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar aluguéis:", error);
    return [];
  }

  return (data || []).map(mapRentalFromDB);
}

// Alias
export const getAll = getAllRentals;

export async function getRentalById(id: string): Promise<Rental> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      property:properties(*),
      tenant:tenants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Aluguel não encontrado");

  return mapRentalFromDB(data);
}

// Alias
export const getById = getRentalById;

export async function createRental(data: Partial<Rental>): Promise<Rental> {
  const dbData = mapRentalToDB(data);
  const result = await createSingle<any>(TABLE, dbData);
  return mapRentalFromDB(result);
}

// Alias
export const create = createRental;

export async function updateRental(id: string, data: Partial<Rental>): Promise<Rental> {
  const dbData = mapRentalToDB(data);
  const result = await updateSingle<any>(TABLE, id, dbData);
  return mapRentalFromDB(result);
}

// Alias
export const update = updateRental;

export async function deleteRental(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deleteRental;