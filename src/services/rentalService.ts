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
    paymentDay: data.payment_day,
    value: Number(data.value || data.monthly_rent || 0), // Fallback seguro
    depositAmount: data.deposit ? Number(data.deposit) : 0,
    status: data.status,
    isActive: data.is_active,
    attachments: data.attachments || [],
    contractAttachments: data.contract_attachments || [],
    
    // Mapeamento explícito dos novos campos
    hasGarage: data.has_garage || false,
    garageValue: data.garage_value ? Number(data.garage_value) : 0,
    hasPartnerBroker: data.has_partner_broker || false,
    
    // Campos de parcelamento da caução
    depositInstallments: data.deposit_installments,
    depositInstallment1: data.deposit_installment_1 ? Number(data.deposit_installment_1) : undefined,
    depositPaymentDate: data.deposit_payment_date,
    depositPixCode: data.deposit_pix_code,
    
    depositInstallment2: data.deposit_installment_2 ? Number(data.deposit_installment_2) : undefined,
    depositInstallment2PaymentDate: data.deposit_installment_2_payment_date,
    depositInstallment2PixCode: data.deposit_installment_2_pix_code,
    
    depositInstallment3: data.deposit_installment_3 ? Number(data.deposit_installment_3) : undefined,
    depositInstallment3PaymentDate: data.deposit_installment_3_payment_date,
    depositInstallment3PixCode: data.deposit_installment_3_pix_code,

    autoRenew: false, // Campo obrigatório na interface Rental, default false se não existir no banco

    // Joins
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
        has_garage,
        garage_value,
        has_partner_broker,
        deposit_installments,
        deposit_installment_1,
        deposit_payment_date,
        deposit_pix_code,
        deposit_installment_2,
        deposit_installment_2_payment_date,
        deposit_installment_2_pix_code,
        deposit_installment_3,
        deposit_installment_3_payment_date,
        deposit_installment_3_pix_code,
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
      monthly_rent: rental.value,
      value: rental.value, // Garantir persistência em ambas as colunas se existirem
      payment_day: rental.paymentDay,
      deposit: rental.depositAmount ? String(rental.depositAmount) : null,
      status: rental.status,
      attachments: rental.attachments,
      contract_attachments: rental.contractAttachments,
      has_garage: rental.hasGarage,
      garage_value: rental.garageValue,
      has_partner_broker: rental.hasPartnerBroker,
      deposit_installments: rental.depositInstallments,
      deposit_installment_1: rental.depositInstallment1,
      deposit_payment_date: rental.depositPaymentDate,
      deposit_pix_code: rental.depositPixCode,
      deposit_installment_2: rental.depositInstallment2,
      deposit_installment_2_payment_date: rental.depositInstallment2PaymentDate,
      deposit_installment_2_pix_code: rental.depositInstallment2PixCode,
      deposit_installment_3: rental.depositInstallment3,
      deposit_installment_3_payment_date: rental.depositInstallment3PaymentDate,
      deposit_installment_3_pix_code: rental.depositInstallment3PixCode
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
    monthly_rent: rental.value,
    value: rental.value,
    deposit: rental.depositAmount ? String(rental.depositAmount) : null,
    status: rental.status,
    is_active: rental.isActive,
    attachments: rental.attachments,
    contract_attachments: rental.contractAttachments,
    
    // Campos críticos que estavam faltando ou com problemas
    has_garage: rental.hasGarage,
    garage_value: rental.garageValue,
    has_partner_broker: rental.hasPartnerBroker,
    
    // Parcelamento da caução
    deposit_installments: rental.depositInstallments,
    deposit_installment_1: rental.depositInstallment1,
    deposit_payment_date: rental.depositPaymentDate,
    deposit_pix_code: rental.depositPixCode,
    
    deposit_installment_2: rental.depositInstallment2,
    deposit_installment_2_payment_date: rental.depositInstallment2PaymentDate,
    deposit_installment_2_pix_code: rental.depositInstallment2PixCode,
    
    deposit_installment_3: rental.depositInstallment3,
    deposit_installment_3_payment_date: rental.depositInstallment3PaymentDate,
    deposit_installment_3_pix_code: rental.depositInstallment3PixCode
  };

  const { data, error } = await supabase
    .from("rentals")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  
  // Retornar o dado mapeado corretamente para a UI atualizar sem refresh
  return mapRentalData(data);
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