import { Rental } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { deleteFutureByRentalId } from "./paymentService";

const TABLE = "rentals";

export async function getAll(): Promise<Rental[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRentalFromDB);
}

export async function getById(id: string): Promise<Rental> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapRentalFromDB(data);
}

export async function create(rental: any): Promise<Rental> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(rental)
    .select()
    .single();

  if (error) throw error;
  return mapRentalFromDB(data);
}

export async function update(id: string, rental: any): Promise<Rental> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(rental)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapRentalFromDB(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function terminateContract(rentalId: string): Promise<void> {
  await deleteFutureByRentalId(rentalId);
  
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: false })
    .eq("id", rentalId);

  if (error) throw error;
}

function mapRentalFromDB(data: any): Rental {
  return {
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    paymentDay: data.payment_day,
    monthlyRent: data.monthly_rent,
    value: data.value,
    hasGarage: data.has_garage,
    garageValue: data.garage_value,
    isActive: data.is_active,
    contractAttachments: data.contract_attachments,
    attachments: data.attachments,
    pixCode: data.pix_code,
    rentAmount: data.rent_amount || data.monthly_rent || 0,
    status: data.is_active ? "active" : "completed",
    autoRenew: data.auto_renew || false,
  };
}