import { Rental } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { deleteFutureByRentalId } from "./paymentService";

const TABLE = "rentals";

function mapRentalToDB(rental: any) {
  const dbRental: any = {
    property_id: rental.propertyId,
    tenant_id: rental.tenantId,
    start_date: rental.startDate,
    end_date: rental.endDate,
    payment_day: rental.paymentDay,
    monthly_rent: rental.monthlyRent,
    value: rental.value,
    has_garage: rental.hasGarage,
    garage_value: rental.garageValue,
    is_active: rental.isActive !== undefined ? rental.isActive : true,
    contract_attachments: rental.contractAttachments,
    attachments: rental.attachments,
    pix_code: rental.pixCode,
    rent_amount: rental.rentAmount,
    auto_renew: rental.autoRenew,
    security_deposit: rental.securityDeposit,
    has_partner_broker: rental.hasPartnerBroker,
    deposit_installments: rental.depositInstallments,
    deposit_installment_1: rental.depositInstallment1,
    deposit_installment_2: rental.depositInstallment2,
    deposit_installment_3: rental.depositInstallment3,
  };

  // Remove undefined values
  Object.keys(dbRental).forEach(key => {
    if (dbRental[key] === undefined) {
      delete dbRental[key];
    }
  });

  return dbRental;
}

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
  const dbRental = mapRentalToDB(rental);
  
  const { data, error } = await supabase
    .from(TABLE)
    .insert(dbRental)
    .select()
    .single();

  if (error) throw error;
  return mapRentalFromDB(data);
}

export async function update(id: string, rental: any): Promise<Rental> {
  const dbRental = mapRentalToDB(rental);
  
  const { data, error } = await supabase
    .from(TABLE)
    .update(dbRental)
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
  // Calcular duração em meses se não vier do banco
  let durationMonths = data.duration_months;
  if (!durationMonths && data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    durationMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
                     (end.getMonth() - start.getMonth());
  }

  return {
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    durationMonths,
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
    securityDeposit: data.security_deposit,
    hasPartnerBroker: data.has_partner_broker,
    depositInstallments: data.deposit_installments,
    depositInstallment1: data.deposit_installment_1,
    depositInstallment2: data.deposit_installment_2,
    depositInstallment3: data.deposit_installment_3,
  };
}