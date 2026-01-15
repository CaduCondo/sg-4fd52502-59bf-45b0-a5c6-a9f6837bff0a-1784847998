import { supabase } from "@/integrations/supabase/client";
import type { Rental } from "@/types";
import { paymentService } from "./paymentService";
import { propertyService } from "./propertyService";
import { tenantService } from "./tenantService";

export const rentalService = {
  async getAll(): Promise<Rental[]> {
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapFromDatabase);
  },

  async getById(id: string): Promise<Rental | null> {
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? this.mapFromDatabase(data) : null;
  },

  async create(rental: Omit<Rental, "id" | "createdAt">): Promise<Rental> {
    const dbRental = this.mapToDatabase(rental);
    
    const { data, error } = await supabase
      .from("rentals")
      .insert(dbRental)
      .select()
      .single();

    if (error) throw error;
    
    const createdRental = this.mapFromDatabase(data);

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

    // Generate monthly payments automatically
    const startDate = new Date(rental.startDate);
    const endDate = rental.endDate ? new Date(rental.endDate) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Set due date to the payment day of the month
      const dueDate = new Date(year, month - 1, rental.paymentDay);
      
      await paymentService.create({
        rentalId: createdRental.id,
        referenceMonth: month,
        referenceYear: year,
        expectedAmount: rental.value,
        paidAmount: 0,
        dueDate: dueDate.toISOString().split("T")[0],
        paymentDate: null,
        paymentMethod: null,
        paymentLocation: null,
        paymentCode: null,
        status: "pending",
        lateFee: 0,
        interest: 0,
        adminFee: 0,
        notes: null,
        attachments: [],
        partialPayments: [],
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return createdRental;
  },

  async update(rental: Rental): Promise<Rental> {
    const dbRental = this.mapToDatabase(rental);
    
    const { data, error } = await supabase
      .from("rentals")
      .update(dbRental)
      .eq("id", rental.id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Map database fields (snake_case) to TypeScript interface (camelCase)
  mapFromDatabase(dbRental: any): Rental {
    return {
      id: dbRental.id,
      propertyId: dbRental.property_id,
      tenantId: dbRental.tenant_id,
      startDate: dbRental.start_date,
      endDate: dbRental.end_date,
      value: parseFloat(dbRental.value),
      monthlyRent: parseFloat(dbRental.monthly_rent),
      hasGarage: dbRental.has_garage || false,
      garageValue: dbRental.garage_value ? parseFloat(dbRental.garage_value) : undefined,
      paymentDay: dbRental.payment_day,
      deposit: dbRental.deposit || undefined,
      contractAttachments: dbRental.contract_attachments || [],
      isActive: dbRental.is_active,
      notes: dbRental.notes || undefined,
      createdAt: dbRental.created_at,
    };
  },

  // Map TypeScript interface (camelCase) to database fields (snake_case)
  mapToDatabase(rental: Partial<Rental>): any {
    const dbRental: any = {};
    
    if (rental.propertyId !== undefined) dbRental.property_id = rental.propertyId;
    if (rental.tenantId !== undefined) dbRental.tenant_id = rental.tenantId;
    if (rental.startDate !== undefined) dbRental.start_date = rental.startDate;
    if (rental.endDate !== undefined) dbRental.end_date = rental.endDate;
    if (rental.value !== undefined) dbRental.value = rental.value;
    if (rental.monthlyRent !== undefined) dbRental.monthly_rent = rental.monthlyRent;
    if (rental.hasGarage !== undefined) dbRental.has_garage = rental.hasGarage;
    if (rental.garageValue !== undefined) dbRental.garage_value = rental.garageValue;
    if (rental.paymentDay !== undefined) dbRental.payment_day = rental.paymentDay;
    if (rental.deposit !== undefined) dbRental.deposit = rental.deposit;
    if (rental.contractAttachments !== undefined) dbRental.contract_attachments = rental.contractAttachments;
    if (rental.isActive !== undefined) dbRental.is_active = rental.isActive;
    if (rental.notes !== undefined) dbRental.notes = rental.notes;
    
    return dbRental;
  }
};