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
    rentAmount: data.rent_value || 0,
    depositAmount: data.deposit_value || 0,
    paymentDay: data.rent_due_day || 0,
    status: data.status,
    attachments: data.attachments || [],
    contractAttachments: data.contract_attachments || [],
    value: data.rent_value || 0, // Compatibilidade
    isActive: data.status === 'active',
    autoRenew: false, // Valor padrão se não existir no banco
    
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
    // Mapear camelCase para snake_case para inserção
    const dbData = {
      property_id: rental.propertyId,
      tenant_id: rental.tenantId,
      start_date: rental.startDate,
      end_date: rental.endDate,
      monthly_rent: rental.rentAmount, // Correct column name
      payment_day: rental.paymentDay,  // Correct column name
      deposit: rental.depositAmount ? String(rental.depositAmount) : null, // Correct column name
      status: rental.status,
      attachments: rental.attachments,
      contract_attachments: rental.contractAttachments,
      value: rental.rentAmount // Ensure value is also set if needed or let DB handle it
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
    // Mapear camelCase para snake_case para atualização
    const dbData: any = {};
    if (rental.propertyId) dbData.property_id = rental.propertyId;
    if (rental.tenantId) dbData.tenant_id = rental.tenantId;
    if (rental.startDate) dbData.start_date = rental.startDate;
    if (rental.endDate) dbData.end_date = rental.endDate;
    if (rental.rentAmount) dbData.monthly_rent = rental.rentAmount; // Correct column name
    if (rental.paymentDay) dbData.payment_day = rental.paymentDay;   // Correct column name
    if (rental.depositAmount) dbData.deposit = String(rental.depositAmount); // Correct column name
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
export const create = rentalService.create;
export const update = rentalService.update;
export const getAll = rentalService.getAll;
export const getById = rentalService.getById;
export const remove = rentalService.remove;
export const terminateContract = rentalService.terminateContract;