import { supabase } from "@/integrations/supabase/client";
import { Rental, Attachment } from "@/types";
import { depositInstallmentService } from "./depositInstallmentService";
import { updatePendingPaymentsOnRentalEdit } from "./paymentService";

// Helper para mapear dados do banco para o tipo Rental
const mapRentalData = (data: any): Rental => {
  // Extrair parcelas do caução da resposta
  const installments = data.deposit_installments || [];
  const installment1 = installments.find((i: any) => i.installment_number === 1);
  const installment2 = installments.find((i: any) => i.installment_number === 2);
  const installment3 = installments.find((i: any) => i.installment_number === 3);

  // Tratamento seguro para tenants e properties
  const tenantData = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
  const propertyData = Array.isArray(data.properties) ? data.properties[0] : data.properties;

  const rental: Rental = {
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    paymentDay: data.rent_due_day,
    value: Number(data.rent_value || 0),
    monthlyRent: Number(data.rent_value || 0),
    depositAmount: data.deposit_value ? Number(data.deposit_value) : 0,
    status: data.status as "active" | "ended" | "terminated",
    isActive: data.is_active,
    attachments: (data.attachments as unknown as (string | Attachment)[]) || [],
    contractAttachments: (data.contract_attachments as unknown as string[]) || [],
    hasGarage: data.has_garage || false,
    garageValue: Number(data.garage_value || 0),
    hasPartnerBroker: data.has_partner_broker || false,
    pixCode: data.pix_code || "",
    
    depositInstallments: data.deposit_installments || 0,

    property: propertyData ? {
      id: propertyData.id,
      locationId: propertyData.location_id,
      location: propertyData.locations?.name || "",
      propertyIdentifier: propertyData.property_identifier,
      complement: propertyData.complement,
      description: propertyData.description || "",
      rooms: propertyData.rooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      area: propertyData.area || 0,
      value: Number(propertyData.value || 0),
      monthlyRent: Number(propertyData.value || 0),
      hasGarage: propertyData.has_garage || false,
      hasFurniture: propertyData.has_furniture || false,
      acceptsPets: propertyData.accepts_pets || false,
      status: (propertyData.status as "available" | "occupied" | "unavailable") || "available",
      images: propertyData.images || [],
      createdAt: propertyData.created_at || new Date().toISOString(),
      address: "",
      features: [],
    } : undefined,
    
    tenant: tenantData ? {
      id: tenantData.id,
      name: tenantData.name,
      phone: tenantData.phone,
      email: "",
      document: tenantData.cpf || "",
      cpf: tenantData.cpf || "",
      status: "active" as const,
    } : undefined,

    // 1ª Parcela (ou À Vista)
    depositInstallment1: Number(installment1?.amount || 0),
    depositInstallment1DueDate: installment1?.due_date || null,
    depositInstallment1PaymentDate: installment1?.payment_date || null,
    depositInstallment1PixCode: installment1?.pix_code || "",
    
    // Aliases para compatibilidade
    depositPaymentDate: installment1?.payment_date || null,
    depositPixCode: installment1?.pix_code || "",
    depositDueDate: installment1?.due_date || null,
    
    // 2ª Parcela
    depositInstallment2: Number(installment2?.amount || 0),
    depositInstallment2DueDate: installment2?.due_date || null,
    depositInstallment2PaymentDate: installment2?.payment_date || null,
    depositInstallment2PixCode: installment2?.pix_code || "",
    
    // 3ª Parcela
    depositInstallment3: Number(installment3?.amount || 0),
    depositInstallment3DueDate: installment3?.due_date || null,
    depositInstallment3PaymentDate: installment3?.payment_date || null,
    depositInstallment3PixCode: installment3?.pix_code || "",
  };

  return rental;
};

export const rentalService = {
  async getAll(): Promise<Rental[]> {
    console.log("🔄 [rentalService.getAll] Buscando todas as locações...");
    
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        tenants!rentals_tenant_id_fkey(
          id, name, phone, cpf
        ),
        properties!rentals_property_id_fkey(
          id, location_id, property_identifier, complement, value, description, 
          rooms, bathrooms, area, has_garage, has_furniture, accepts_pets, status, 
          images, created_at,
          locations!properties_location_id_fkey(id, name)
        ),
        deposit_installments(
          id, installment_number, amount, pix_code, payment_date, due_date, 
          status, total_installments
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [rentalService.getAll] Erro:", error);
      throw error;
    }

    console.log(`✅ [rentalService.getAll] ${data?.length || 0} locações retornadas`);
    
    const mappedRentals = data?.map((rental: any) => mapRentalData(rental)) || [];
    
    return mappedRentals;
  },

  async getById(id: string): Promise<Rental> {
    console.log(`🔄 [rentalService.getById] Buscando locação ${id}...`);
    
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        tenants!rentals_tenant_id_fkey(
          id, name, phone, cpf
        ),
        properties!rentals_property_id_fkey(
          id, location_id, property_identifier, complement, value, description, 
          rooms, bathrooms, area, has_garage, has_furniture, accepts_pets, status, 
          images, created_at,
          locations!properties_location_id_fkey(id, name)
        ),
        deposit_installments(
          id, installment_number, amount, pix_code, payment_date, due_date, 
          status, total_installments
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ [rentalService.getById] Erro:", error);
      throw error;
    }

    console.log("✅ [rentalService.getById] Locação encontrada");
    
    return mapRentalData(data);
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
          dueDate1: rental.depositDueDate,
          paymentDate1: rental.depositPaymentDate,
          pixCode1: rental.depositPixCode,
          installment2: rental.depositInstallment2,
          dueDate2: rental.depositInstallment2DueDate,
          paymentDate2: rental.depositInstallment2PaymentDate,
          pixCode2: rental.depositInstallment2PixCode,
          installment3: rental.depositInstallment3,
          dueDate3: rental.depositInstallment3DueDate,
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

    // Buscar dados completos para retornar
    return this.getById(data.id);
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
          dueDate1: rental.depositDueDate,
          paymentDate1: rental.depositPaymentDate,
          pixCode1: rental.depositPixCode,
          installment2: rental.depositInstallment2,
          dueDate2: rental.depositInstallment2DueDate,
          paymentDate2: rental.depositInstallment2PaymentDate,
          pixCode2: rental.depositInstallment2PixCode,
          installment3: rental.depositInstallment3,
          dueDate3: rental.depositInstallment3DueDate,
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
      const fullRental = await this.getById(id);
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

    // Buscar dados completos para retornar
    return this.getById(id);
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