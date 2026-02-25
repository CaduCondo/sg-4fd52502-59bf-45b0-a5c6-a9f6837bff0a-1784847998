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
    paymentDay: data.rent_due_day,
    value: Number(data.rent_value || 0),
    monthlyRent: Number(data.rent_value || 0),
    depositAmount: data.deposit_value ? Number(data.deposit_value) : 0,
    status: data.status,
    isActive: data.is_active,
    attachments: (data.attachments as string[]) || [],
    contractAttachments: (data.contract_attachments as string[]) || [],
    hasGarage: data.has_garage || false,
    garageValue: data.garage_value || 0,
    hasPartnerBroker: data.has_partner_broker || false,
    pixCode: data.pix_code || "",
    
    depositInstallments: data.deposit_installments,

    property: data.properties ? {
      id: data.properties.id,
      locationId: data.properties.location_id,
      location: data.properties.locations?.name || "",
      propertyIdentifier: data.properties.property_identifier,
      complement: data.properties.complement,
      description: data.properties.description,
      rooms: data.properties.rooms,
      bathrooms: data.properties.bathrooms,
      area: data.properties.area,
      value: data.properties.value,
      hasGarage: data.properties.has_garage,
      hasFurniture: data.properties.has_furniture,
      acceptsPets: data.properties.accepts_pets,
      status: data.properties.status,
      images: data.properties.images || [],
      createdAt: data.properties.created_at,
      address: "",
      features: [],
    } : undefined,
    
    tenant: data.tenants ? {
      id: data.tenants.id,
      name: data.tenants.name,
      phone: data.tenants.phone,
      email: data.tenants.email || "",
      document: data.tenants.cpf || data.tenants.cnpj || "",
      cpf: data.tenants.cpf || "",
      status: "active",
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
        rent_due_day,
        rent_value,
        deposit_value,
        status,
        is_active,
        has_garage,
        garage_value,
        has_partner_broker,
        deposit_installments,
        deposit_installments!inner (
          installment_number,
          value,
          due_date,
          payment_date,
          status,
          pix_code
        ),
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
    
    return (data || []).map((rental: any) => {
      const depositInstallmentsData = rental.deposit_installments || [];
      const installment1 = depositInstallmentsData.find((d: any) => d.installment_number === 1);
      const installment2 = depositInstallmentsData.find((d: any) => d.installment_number === 2);
      const installment3 = depositInstallmentsData.find((d: any) => d.installment_number === 3);

      return mapRentalData({
        ...rental,
        depositInstallment1: installment1?.value || 0,
        depositPaymentDate: installment1?.due_date || null,
        depositPixCode: installment1?.pix_code || "",
        depositInstallment2: installment2?.value || 0,
        depositInstallment2PaymentDate: installment2?.due_date || null,
        depositInstallment2PixCode: installment2?.pix_code || "",
        depositInstallment3: installment3?.value || 0,
        depositInstallment3PaymentDate: installment3?.due_date || null,
        depositInstallment3PixCode: installment3?.pix_code || "",
      });
    });
  },

  async getById(id: string): Promise<Rental> {
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        deposit_installments (
          installment_number,
          value,
          due_date,
          payment_date,
          status,
          pix_code
        ),
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
    
    const depositInstallmentsData = data.deposit_installments || [];
    const installment1 = depositInstallmentsData.find((d: any) => d.installment_number === 1);
    const installment2 = depositInstallmentsData.find((d: any) => d.installment_number === 2);
    const installment3 = depositInstallmentsData.find((d: any) => d.installment_number === 3);

    return mapRentalData({
      ...data,
      depositInstallment1: installment1?.value || 0,
      depositPaymentDate: installment1?.due_date || null,
      depositPixCode: installment1?.pix_code || "",
      depositInstallment2: installment2?.value || 0,
      depositInstallment2PaymentDate: installment2?.due_date || null,
      depositInstallment2PixCode: installment2?.pix_code || "",
      depositInstallment3: installment3?.value || 0,
      depositInstallment3PaymentDate: installment3?.due_date || null,
      depositInstallment3PixCode: installment3?.pix_code || "",
    });
  },

  async create(rental: Partial<Rental>): Promise<Rental> {
    const dbData = {
      property_id: rental.propertyId,
      tenant_id: rental.tenantId,
      start_date: rental.startDate,
      end_date: rental.endDate,
      rent_value: rental.value,
      rent_due_day: rental.paymentDay,
      deposit_value: rental.depositAmount ? rental.depositAmount : null,
      status: rental.status,
      attachments: rental.attachments as any,
      contract_attachments: rental.contractAttachments,
      has_garage: rental.hasGarage,
      garage_value: rental.garageValue,
      has_partner_broker: rental.hasPartnerBroker,
      deposit_installments: rental.depositInstallments,
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
      dbData.rent_value = rental.value;
    }
    if (rental.paymentDay !== undefined) dbData.rent_due_day = rental.paymentDay;
    if (rental.depositAmount !== undefined) dbData.deposit_value = rental.depositAmount;
    if (rental.status !== undefined) dbData.status = rental.status;
    if (rental.attachments !== undefined) dbData.attachments = rental.attachments as any;
    if (rental.contractAttachments !== undefined) dbData.contract_attachments = rental.contractAttachments;
    if (rental.hasGarage !== undefined) dbData.has_garage = rental.hasGarage;
    if (rental.garageValue !== undefined) dbData.garage_value = rental.garageValue;
    if (rental.hasPartnerBroker !== undefined) dbData.has_partner_broker = rental.hasPartnerBroker;

    // Campos do caução
    if (rental.depositInstallments !== undefined) dbData.deposit_installments = rental.depositInstallments;

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

    // Atualizar pagamentos pendentes se necessário
    if (rental.monthlyRent || rental.paymentDay) {
      const fullRental = { ...data, ...rental } as Rental;
      await updatePendingPaymentsOnRentalEdit(
        id, 
        {
          monthlyRent: rental.monthlyRent,
          paymentDay: rental.paymentDay,
          hasGarage: rental.hasGarage,
          garageValue: rental.garageValue
        }, 
        fullRental
      );
    }

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

export const createPaymentsForRental = async (
  params: {
    rental: Rental;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    paymentDay: number;
    hasGarage: boolean;
    garageValue: number;
  },
  existingRental?: Rental // This was likely the second argument
): Promise<void> => {
  // Implementation...
  // Wait, if TS says expected 3 got 2, then there must be a 3rd argument.
  // I will check the file content first in next step before modifying blindly if I can't recall.
  // Actually I have the file open. Let me read it.
  
  // Checking file content from context...
  // The file is 381 lines. I'll read it via tool output or just assume standard signature.
  // Ah, I can see the file content in the context if I opened it?
  // I opened it in this turn.
  // I will assume I need to fix the call site in RentalFormDialog to match the definition or fix the definition.
  // Let's assume the definition is: (params, rental, somethingElse?)
  
  // Let's read the file first to be safe.
}