import { supabase } from "@/integrations/supabase/client";
import type { Rental } from "@/types";

export const rentalService = {
  async getAll(): Promise<Rental[]> {
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        property:properties!rentals_property_id_fkey (
          *,
          locationData:locations!properties_location_id_fkey (*)
        ),
        tenant:tenants (*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return data.map((item: any) => ({
      id: item.id,
      propertyId: item.property_id,
      tenantId: item.tenant_id,
      startDate: item.start_date,
      endDate: item.end_date,
      rentAmount: item.rent_amount,
      depositAmount: item.deposit_amount,
      paymentDay: item.payment_day,
      contractUrl: item.contract_url,
      autoRenew: item.auto_renew,
      adminFee: item.admin_fee,
      status: item.status,
      isActive: item.status === 'active',
      monthlyRent: item.rent_amount,
      value: (item.rent_amount || 0) + (item.garage_value || 0),
      hasGarage: item.has_garage,
      garageValue: item.garage_value,
      attachments: item.attachments,
      contractAttachments: item.contract_attachments,
      createdAt: item.created_at,
      deposit: item.deposit,
      
      property: item.property ? {
        ...item.property,
        location_id: item.property.location_id,
        property_identifier: item.property.property_identifier,
        monthly_rent: item.property.monthly_rent,
        locationData: item.property.locationData
      } : undefined,
      
      tenant: item.tenant ? {
        ...item.tenant,
        birthDate: item.tenant.birth_date,
        zipCode: item.tenant.zip_code,
        createdAt: item.tenant.created_at
      } : undefined
    })) as Rental[];
  },

  async getById(id: string): Promise<Rental | null> {
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        property:properties!rentals_property_id_fkey (
          *,
          locationData:locations!properties_location_id_fkey (*)
        ),
        tenant:tenants (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const item: any = data;

    return {
      id: item.id,
      propertyId: item.property_id,
      tenantId: item.tenant_id,
      startDate: item.start_date,
      endDate: item.end_date,
      rentAmount: item.rent_amount,
      depositAmount: item.deposit_amount,
      paymentDay: item.payment_day,
      contractUrl: item.contract_url,
      autoRenew: item.auto_renew,
      adminFee: item.admin_fee,
      status: item.status,
      isActive: item.status === 'active',
      monthlyRent: item.rent_amount,
      value: (item.rent_amount || 0) + (item.garage_value || 0),
      hasGarage: item.has_garage,
      garageValue: item.garage_value,
      attachments: item.attachments,
      contractAttachments: item.contract_attachments,
      createdAt: item.created_at,
      deposit: item.deposit,
      
      property: item.property ? {
        ...item.property,
        location_id: item.property.location_id,
        property_identifier: item.property.property_identifier,
        monthly_rent: item.property.monthly_rent,
        locationData: item.property.locationData
      } : undefined,
      
      tenant: item.tenant ? {
        ...item.tenant,
        birthDate: item.tenant.birth_date,
        zipCode: item.tenant.zip_code,
        createdAt: item.tenant.created_at
      } : undefined
    } as Rental;
  },

  async create(rental: Omit<Rental, "id" | "createdAt" | "status" | "property" | "tenant">): Promise<Rental> {
    const { data, error } = await supabase
      .from("rentals")
      .insert([{
        property_id: rental.propertyId,
        tenant_id: rental.tenantId,
        start_date: rental.startDate,
        end_date: rental.endDate,
        rent_amount: rental.rentAmount || rental.monthlyRent,
        deposit_amount: rental.depositAmount,
        payment_day: rental.paymentDay,
        contract_url: rental.contractUrl,
        auto_renew: rental.autoRenew,
        admin_fee: rental.adminFee,
        status: rental.isActive ? 'active' : 'inactive',
        has_garage: rental.hasGarage,
        garage_value: rental.garageValue,
        attachments: rental.attachments || [],
        contract_attachments: rental.contractAttachments || []
      } as any]) // Type assertion
      .select()
      .single();

    if (error) throw error;
    
    // Return a basic Rental object, caller might need to reload for relations
    const item: any = data;
    return {
      id: item.id,
      propertyId: item.property_id,
      tenantId: item.tenant_id,
      startDate: item.start_date,
      endDate: item.end_date,
      rentAmount: item.rent_amount,
      depositAmount: item.deposit_amount,
      paymentDay: item.payment_day,
      contractUrl: item.contract_url,
      autoRenew: item.auto_renew,
      adminFee: item.admin_fee,
      status: item.status,
      isActive: item.status === 'active',
      monthlyRent: item.rent_amount,
      value: (item.rent_amount || 0) + (item.garage_value || 0),
      hasGarage: item.has_garage,
      garageValue: item.garage_value,
      attachments: item.attachments,
      contractAttachments: item.contract_attachments,
      createdAt: item.created_at
    } as Rental;
  },

  async update(rental: Partial<Rental>): Promise<Rental> {
    const updateData: any = {};
    if (rental.propertyId) updateData.property_id = rental.propertyId;
    if (rental.tenantId) updateData.tenant_id = rental.tenantId;
    if (rental.startDate) updateData.start_date = rental.startDate;
    if (rental.endDate !== undefined) updateData.end_date = rental.endDate;
    if (rental.rentAmount) updateData.rent_amount = rental.rentAmount;
    if (rental.monthlyRent) updateData.rent_amount = rental.monthlyRent; // Fallback
    if (rental.depositAmount) updateData.deposit_amount = rental.depositAmount;
    if (rental.paymentDay) updateData.payment_day = rental.paymentDay;
    if (rental.contractUrl) updateData.contract_url = rental.contractUrl;
    if (rental.autoRenew !== undefined) updateData.auto_renew = rental.autoRenew;
    if (rental.adminFee) updateData.admin_fee = rental.adminFee;
    if (rental.isActive !== undefined) updateData.status = rental.isActive ? 'active' : 'inactive';
    if (rental.status) updateData.status = rental.status;
    if (rental.hasGarage !== undefined) updateData.has_garage = rental.hasGarage;
    if (rental.garageValue !== undefined) updateData.garage_value = rental.garageValue;
    if (rental.attachments) updateData.attachments = rental.attachments;
    if (rental.pixCode) updateData.pix_code = rental.pixCode;

    const { data, error } = await supabase
      .from("rentals")
      .update(updateData)
      .eq("id", rental.id)
      .select()
      .single();

    if (error) throw error;
    
    const item: any = data;
    return {
      id: item.id,
      propertyId: item.property_id,
      tenantId: item.tenant_id,
      startDate: item.start_date,
      endDate: item.end_date,
      rentAmount: item.rent_amount,
      depositAmount: item.deposit_amount,
      paymentDay: item.payment_day,
      contractUrl: item.contract_url,
      autoRenew: item.auto_renew,
      adminFee: item.admin_fee,
      status: item.status,
      isActive: item.status === 'active',
      monthlyRent: item.rent_amount,
      value: (item.rent_amount || 0) + (item.garage_value || 0),
      hasGarage: item.has_garage,
      garageValue: item.garage_value,
      attachments: item.attachments,
      contractAttachments: item.contract_attachments,
      createdAt: item.created_at
    } as Rental;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};