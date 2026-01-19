import { supabase } from "@/integrations/supabase/client";
import type { Rental } from "@/types";
import { paymentService } from "@/services/paymentService";

export const rentalService = {
  async getAll(): Promise<Rental[]> {
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data.map(this.mapFromDB);
  },

  async getById(id: string): Promise<Rental | null> {
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data ? this.mapFromDB(data) : null;
  },

  async create(rental: Omit<Rental, "id" | "createdAt">): Promise<Rental> {
    const { data, error } = await supabase
      .from("rentals")
      .insert([this.mapToDB(rental)])
      .select()
      .single();
    
    if (error) throw error;

    // Update tenant status to rented
    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ status: "rented" })
      .eq("id", rental.tenantId);

    if (tenantError) {
      console.error("Error updating tenant status:", tenantError);
    }

    return this.mapFromDB(data);
  },

  async update(rental: Rental): Promise<Rental> {
    const { data, error } = await supabase
      .from("rentals")
      .update({
        ...this.mapToDB(rental),
        updated_at: new Date().toISOString()
      })
      .eq("id", rental.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  mapFromDB(data: any): Rental {
    return {
      id: data.id,
      propertyId: data.property_id,
      tenantId: data.tenant_id,
      startDate: data.start_date,
      endDate: data.end_date,
      
      // Required fields with defaults
      rentAmount: data.rent_amount || data.value || 0,
      status: (data.status as any) || "active",
      autoRenew: data.auto_renew || false,
      
      monthlyRent: data.monthly_rent || 0, // Compatibility
      paymentDay: data.payment_day,
      hasGarage: data.has_garage,
      garageValue: data.garage_value || 0,
      value: data.value || 0, // Compatibility
      
      deposit: data.deposit,
      contractAttachments: data.contract_attachments || [],
      attachments: data.attachments || [],
      
      isActive: data.is_active,
      pixCode: data.pix_code,
      createdAt: data.created_at,
    };
  },

  mapToDB(rental: any): any {
    return {
      property_id: rental.propertyId,
      tenant_id: rental.tenantId,
      start_date: rental.startDate,
      end_date: rental.endDate,
      monthly_rent: rental.monthlyRent,
      payment_day: rental.paymentDay,
      has_garage: rental.hasGarage,
      garage_value: rental.garageValue,
      value: rental.value,
      deposit: rental.deposit,
      contract_attachments: rental.contractAttachments || [],
      attachments: rental.attachments || [],
      is_active: rental.isActive,
      pix_code: rental.pixCode
    };
  }
};