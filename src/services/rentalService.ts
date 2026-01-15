import { supabase } from "@/integrations/supabase/client";
import type { Rental } from "@/types";
import { propertyService } from "./propertyService";
import { tenantService } from "./tenantService";
import { paymentService } from "./paymentService";

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
    // Map the rental object to DB columns correctly
    const dbPayload = {
      property_id: rental.propertyId,
      tenant_id: rental.tenantId,
      start_date: rental.startDate,
      end_date: rental.endDate,
      value: rental.value,
      monthly_rent: rental.value, // Assuming value is the monthly rent
      payment_day: rental.paymentDay,
      is_active: rental.isActive !== undefined ? rental.isActive : true,
      has_garage: rental.hasGarage || false,
      notes: rental.notes,
    };

    const { data, error } = await supabase
      .from("rentals")
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;

    const createdRental = this.mapFromDB(data);

    // Update property status to occupied
    const property = await propertyService.getById(rental.propertyId);
    if (property) {
      await propertyService.update({ ...property, status: "occupied" });
    }

    // Update tenant status to rented
    const tenant = await tenantService.getById(rental.tenantId);
    if (tenant) {
      await tenantService.update({ ...tenant, status: "rented" });
    }

    // Generate monthly payments from start_date to end_date
    if (rental.startDate && rental.value) {
      const startDate = new Date(rental.startDate);
      // Default to 12 months if no end date provided, or use provided end date
      const endDate = rental.endDate 
        ? new Date(rental.endDate) 
        : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
      
      const paymentDay = rental.paymentDay;
      const monthlyValue = rental.value;

      // Start generating payments from the first month
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), paymentDay);

      // If the first payment day is before the start date, verify business logic. 
      // Usually first payment is either at start or next month. 
      // Assuming next month if payment day passed, or same month if future.
      if (currentDate < startDate) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Generate payments for each month
      while (currentDate <= endDate) {
        const dueDate = new Date(currentDate);
        
        await paymentService.create({
          rentalId: createdRental.id,
          referenceMonth: dueDate.getMonth() + 1,
          referenceYear: dueDate.getFullYear(),
          dueDate: dueDate.toISOString().split("T")[0],
          expectedAmount: monthlyValue,
          paidAmount: 0,
          status: "pending",
          paymentDate: null,
          paymentMethod: null,
          notes: null,
          lateFee: 0,
          interest: 0,
          attachments: [],
          partialPayments: []
        });

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return createdRental;
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
      monthlyRent: parseFloat(data.monthly_rent || data.value || 0),
      paymentDay: data.payment_day,
      hasGarage: data.has_garage,
      garageValue: data.garage_value ? parseFloat(data.garage_value) : undefined,
      value: data.value ? parseFloat(data.value) : (parseFloat(data.monthly_rent || 0) + (data.garage_value ? parseFloat(data.garage_value) : 0)),
      deposit: data.deposit,
      contractAttachments: data.contract_attachments || [],
      isActive: data.is_active,
      notes: data.notes,
      createdAt: data.created_at
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
      is_active: rental.isActive,
      notes: rental.notes
    };
  }
};