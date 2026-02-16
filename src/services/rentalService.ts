import { supabase } from "@/integrations/supabase/client";
import { Rental } from "@/types";
import { depositInstallmentService } from "./depositInstallmentService";
import { updatePendingPaymentsOnRentalEdit } from "./paymentService";

// Helper para mapear dados do banco para o tipo Rental
const mapRentalData = (data: any): Rental => {
  return {
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    paymentDay: data.payment_day,
    value: Number(data.value || data.monthly_rent || 0),
    depositAmount: data.deposit ? Number(data.deposit) : 0,
    status: data.status,
    isActive: data.is_active,
    attachments: (data.attachments as string[]) || [],
    contractAttachments: (data.contract_attachments as string[]) || [],
    autoRenew: data.auto_renew,
    pixCode: data.pix_code,
    
    hasGarage: Boolean(data.has_garage),
    garageValue: data.garage_value ? Number(data.garage_value) : undefined,
    hasPartnerBroker: data.has_partner_broker || false,
    
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

    // Incluir dados relacionados
    property: data.properties ? {
      id: data.properties.id,
      locationId: data.properties.location_id,
      propertyIdentifier: data.properties.property_identifier,
      complement: data.properties.complement,
      value: data.properties.value,
      location: data.properties.locations?.name || '',
      locationName: data.properties.locations?.name || '',
    } : undefined,
    
    tenant: data.tenants ? {
      id: data.tenants.id,
      name: data.tenants.name,
      phone: data.tenants.phone,
    } : undefined,
  };
};

export const rentalService = {
  async getAll(): Promise<Rental[]> {
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        id,
        property_id,
        tenant_id,
        start_date,
        end_date,
        payment_day,
        value,
        deposit,
        status,
        is_active,
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
          phone
        ),
        properties!rentals_property_id_fkey (
          id,
          location_id,
          property_identifier,
          complement,
          value,
          locations!properties_location_id_fkey (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
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
      value: rental.value,
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

    // Sincronizar parcelas do caução se houver
    if (rental.depositInstallments && rental.depositInstallments > 0) {
      await depositInstallmentService.syncDepositInstallments(
        data.id,
        rental.depositInstallments,
        {
          installment1: rental.depositInstallment1,
          paymentDate1: rental.depositPaymentDate,
          pixCode1: rental.depositPixCode,
          installment2: rental.depositInstallment2,
          paymentDate2: rental.depositInstallment2PaymentDate,
          pixCode2: rental.depositInstallment2PixCode,
          installment3: rental.depositInstallment3,
          paymentDate3: rental.depositInstallment3PaymentDate,
          pixCode3: rental.depositInstallment3PixCode,
        },
        rental.hasPartnerBroker || false
      );
    }

    // Atualizar status do inquilino
    if (rental.tenantId) {
      await supabase
        .from("tenants")
        .update({ status: "rented" })
        .eq("id", rental.tenantId);
    }

    return mapRentalData(data);
  },

  async update(id: string, rental: Partial<Rental>): Promise<Rental> {
    const dbData: any = {};
    if (rental.propertyId !== undefined) dbData.property_id = rental.propertyId;
    if (rental.tenantId !== undefined) dbData.tenant_id = rental.tenantId;
    if (rental.startDate !== undefined) dbData.start_date = rental.startDate;
    if (rental.endDate !== undefined) dbData.end_date = rental.endDate;
    if (rental.value !== undefined) {
      dbData.monthly_rent = rental.value;
      dbData.value = rental.value;
    }
    if (rental.paymentDay !== undefined) dbData.payment_day = rental.paymentDay;
    if (rental.depositAmount !== undefined) dbData.deposit = String(rental.depositAmount);
    if (rental.status !== undefined) dbData.status = rental.status;
    if (rental.attachments !== undefined) dbData.attachments = rental.attachments;
    if (rental.contractAttachments !== undefined) dbData.contract_attachments = rental.contractAttachments;
    if (rental.hasGarage !== undefined) dbData.has_garage = rental.hasGarage;
    if (rental.garageValue !== undefined) dbData.garage_value = rental.garageValue;
    if (rental.hasPartnerBroker !== undefined) dbData.has_partner_broker = rental.hasPartnerBroker;

    // Campos do caução
    if (rental.depositInstallments !== undefined) dbData.deposit_installments = rental.depositInstallments;
    if (rental.depositInstallment1 !== undefined) dbData.deposit_installment_1 = rental.depositInstallment1;
    if (rental.depositPaymentDate !== undefined) dbData.deposit_payment_date = rental.depositPaymentDate;
    if (rental.depositPixCode !== undefined) dbData.deposit_pix_code = rental.depositPixCode;
    if (rental.depositInstallment2 !== undefined) dbData.deposit_installment_2 = rental.depositInstallment2;
    if (rental.depositInstallment2PaymentDate !== undefined) dbData.deposit_installment_2_payment_date = rental.depositInstallment2PaymentDate;
    if (rental.depositInstallment2PixCode !== undefined) dbData.deposit_installment_2_pix_code = rental.depositInstallment2PixCode;
    if (rental.depositInstallment3 !== undefined) dbData.deposit_installment_3 = rental.depositInstallment3;
    if (rental.depositInstallment3PaymentDate !== undefined) dbData.deposit_installment_3_payment_date = rental.depositInstallment3PaymentDate;
    if (rental.depositInstallment3PixCode !== undefined) dbData.deposit_installment_3_pix_code = rental.depositInstallment3PixCode;

    const { data, error } = await supabase
      .from("rentals")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Sincronizar parcelas do caução se houver mudanças
    if (rental.depositInstallments !== undefined) {
      await depositInstallmentService.syncDepositInstallments(
        id,
        rental.depositInstallments || null,
        {
          installment1: rental.depositInstallment1,
          paymentDate1: rental.depositPaymentDate,
          pixCode1: rental.depositPixCode,
          installment2: rental.depositInstallment2,
          paymentDate2: rental.depositInstallment2PaymentDate,
          pixCode2: rental.depositInstallment2PixCode,
          installment3: rental.depositInstallment3,
          paymentDate3: rental.depositInstallment3PaymentDate,
          pixCode3: rental.depositInstallment3PixCode,
        },
        rental.hasPartnerBroker || data.has_partner_broker || false
      );
    }

    // Sincronizar status do inquilino
    if (rental.status !== undefined) {
      const tenantId = rental.tenantId || data.tenant_id;
      if (tenantId) {
        const newTenantStatus = rental.status === "active" ? "rented" : "active";
        await supabase
          .from("tenants")
          .update({ status: newTenantStatus })
          .eq("id", tenantId);
      }
    }

    // Atualizar recebimentos pendentes
    await updatePendingPaymentsOnRentalEdit(id, {
      amount: Number(data.value || data.monthly_rent),
      paymentDay: data.payment_day,
    });

    return mapRentalData(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("rentals").delete().eq("id", id);
    if (error) throw error;
  },

  async terminateContract(id: string): Promise<void> {
    const { data: rentalData, error: fetchError } = await supabase
      .from("rentals")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("rentals")
      .update({ 
        status: "terminated", 
        end_date: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) throw error;

    // Atualizar status do inquilino
    if (rentalData?.tenant_id) {
      await supabase
        .from("tenants")
        .update({ status: "active" })
        .eq("id", rentalData.tenant_id);
    }
  }
};

// Aliases para compatibilidade
export const getAll = rentalService.getAll;
export const getById = rentalService.getById;
export const remove = rentalService.remove;
export const terminateContract = rentalService.terminateContract;
export const create = async (rental: Omit<Rental, "id">) => rentalService.create(rental);
export const update = async (id: string, rental: Partial<Rental>) => rentalService.update(id, rental);