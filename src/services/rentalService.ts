import { supabase } from "@/integrations/supabase/client";
import { Rental } from "@/types";

// Helper para mapear dados do banco para o tipo Rental
const mapRentalData = (data: any): Rental => {
  return {
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    value: data.value || data.monthly_rent || 0, // Prioridade para value
    depositAmount: Number(data.deposit) || 0,
    paymentDay: data.payment_day || 0,
    status: data.status,
    attachments: data.attachments || [],
    contractAttachments: data.contract_attachments || [],
    isActive: data.status === 'active',
    autoRenew: false,
    
    // Propriedades aninhadas
    properties: data.properties,
    tenants: data.tenants
  };
};

export const rentalService = {
  async getAll(): Promise<Rental[]> {
    console.time("⏱️ Rental Query Performance");
    
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        id,
        tenant_id,
        property_id,
        start_date,
        end_date,
        status,
        rent_value,
        rent_due_day,
        deposit_value,
        created_at,
        tenants!rentals_tenant_id_fkey (
          id,
          name,
          phone
        ),
        properties!rentals_property_id_fkey (
          id,
          property_identifier,
          complement,
          value,
          locations!properties_location_id_fkey (
            id,
            name,
            city
          )
        )
      `)
      .order("created_at", { ascending: false });

    console.timeEnd("⏱️ Rental Query Performance");

    if (error) {
      console.error("Error fetching rentals:", error);
      throw error;
    }

    return (data || []).map(mapRentalData);
  },

  async getById(id: string): Promise<Rental> {
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        tenants!rentals_tenant_id_fkey (
          id,
          name,
          email,
          phone,
          cpf,
          rg
        ),
        properties!rentals_property_id_fkey (
          id,
          property_identifier,
          complement,
          description,
          rooms,
          bathrooms,
          area,
          value,
          garage_value,
          has_garage,
          has_furniture,
          accepts_pets,
          images,
          locations!properties_location_id_fkey (
            id,
            name,
            city,
            state,
            neighborhood,
            street
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return mapRentalData(data);
  },

  async create(rental: Partial<Rental>): Promise<Rental> {
    const dbData = {
      property_id: rental.propertyId,
      tenant_id: rental.tenantId,
      start_date: rental.startDate,
      end_date: rental.endDate,
      monthly_rent: rental.value, // Mapear value para monthly_rent no banco se necessário, ou usar value se a coluna existir
      payment_day: rental.paymentDay,
      deposit: rental.depositAmount ? String(rental.depositAmount) : null,
      status: rental.status,
      attachments: rental.attachments,
      contract_attachments: rental.contractAttachments,
      value: rental.value
    };

    const { data, error } = await supabase
      .from("rentals")
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    return mapRentalData(data);
  },

  async update(id: string, rental: Partial<Rental>): Promise<Rental> {
    const dbData: any = {};
    if (rental.propertyId) dbData.property_id = rental.propertyId;
    if (rental.tenantId) dbData.tenant_id = rental.tenantId;
    if (rental.startDate) dbData.start_date = rental.startDate;
    if (rental.endDate) dbData.end_date = rental.endDate;
    if (rental.value) {
      dbData.monthly_rent = rental.value;
      dbData.value = rental.value;
    }
    if (rental.paymentDay) dbData.payment_day = rental.paymentDay;
    if (rental.depositAmount) dbData.deposit = String(rental.depositAmount);
    if (rental.status) dbData.status = rental.status;
    if (rental.attachments) dbData.attachments = rental.attachments;
    if (rental.contractAttachments) dbData.contract_attachments = rental.contractAttachments;

    const { data, error } = await supabase
      .from("rentals")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapRentalData(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("rentals").delete().eq("id", id);
    if (error) throw error;
  },

  async terminateContract(id: string): Promise<void> {
    const { error } = await supabase
      .from("rentals")
      .update({ 
        status: "terminated", 
        end_date: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) throw error;
  }
};

// Aliases para compatibilidade com código existente que pode importar com nomes diferentes
export const create = async (rental: Omit<Rental, "id">) => {
  const insertData = {
    property_id: rental.propertyId,
    tenant_id: rental.tenantId,
    start_date: rental.startDate,
    end_date: rental.endDate,
    payment_day: rental.paymentDay,
    monthly_rent: rental.value, // Obrigatório pelo tipo do banco
    value: rental.value,
    deposit: rental.depositAmount ? String(rental.depositAmount) : null, // Convertendo para string (money type)
    status: rental.status,
    is_active: rental.isActive,
    attachments: rental.attachments,
    contract_attachments: rental.contractAttachments,
    has_garage: rental.hasGarage,
    garage_value: rental.garageValue ? String(rental.garageValue) : null, // Convertendo para string
    has_partner_broker: rental.hasPartnerBroker
  };

  const { data, error } = await supabase
    .from("rentals")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const update = async (id: string, rental: Partial<Rental>) => {
  const updateData: any = {
    ...(rental.propertyId && { property_id: rental.propertyId }),
    ...(rental.tenantId && { tenant_id: rental.tenantId }),
    ...(rental.startDate && { start_date: rental.startDate }),
    ...(rental.endDate && { end_date: rental.endDate }),
    ...(rental.paymentDay && { payment_day: rental.paymentDay }),
    ...(rental.value && { value: rental.value }),
    ...(rental.depositAmount && { deposit: rental.depositAmount }),
    ...(rental.status && { status: rental.status }),
    ...(rental.isActive !== undefined && { is_active: rental.isActive }),
    ...(rental.attachments && { attachments: rental.attachments }),
    ...(rental.contractAttachments && { contract_attachments: rental.contractAttachments }),
    ...(rental.hasGarage !== undefined && { has_garage: rental.hasGarage }),
    ...(rental.garageValue !== undefined && { garage_value: rental.garageValue }),
    ...(rental.hasPartnerBroker !== undefined && { has_partner_broker: rental.hasPartnerBroker }),
  };

  const { data, error } = await supabase
    .from("rentals")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAll = rentalService.getAll;
export const getById = rentalService.getById;
export const remove = rentalService.remove;
export const terminateContract = rentalService.terminateContract;