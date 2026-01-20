import { Payment } from "@/types";
import { 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle
} from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "payments";

// Mapper function to convert DB snake_case to Frontend camelCase
function mapPaymentFromDB(data: any): Payment {
  return {
    ...data,
    rentalId: data.rental_id,
    dueDate: data.due_date,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    paymentDate: data.payment_date,
    paymentMethod: data.payment_method,
    referenceMonth: data.reference_month,
    referenceYear: data.reference_year,
    receiptUrl: data.receipt_url,
    penaltyAmount: data.penalty_amount,
    interestAmount: data.interest_amount,
    discountAmount: data.discount_amount,
    
    // Compatibility fields
    paymentCode: data.payment_code,
    lateFee: data.late_fee,
    interest: data.interest,
    paymentLocation: data.payment_location,
  };
}

// Reverse mapper for writes (camelCase -> snake_case)
function mapPaymentToDB(data: Partial<Payment>): any {
  const dbData: any = { ...data };
  
  if (data.rentalId) dbData.rental_id = data.rentalId;
  if (data.dueDate) dbData.due_date = data.dueDate;
  if (data.expectedAmount) dbData.expected_amount = data.expectedAmount;
  if (data.paidAmount) dbData.paid_amount = data.paidAmount;
  if (data.paymentDate) dbData.payment_date = data.paymentDate;
  if (data.paymentMethod) dbData.payment_method = data.paymentMethod;
  if (data.referenceMonth) dbData.reference_month = data.referenceMonth;
  if (data.referenceYear) dbData.reference_year = data.referenceYear;
  if (data.receiptUrl) dbData.receipt_url = data.receiptUrl;
  if (data.penaltyAmount) dbData.penalty_amount = data.penaltyAmount;
  if (data.interestAmount) dbData.interest_amount = data.interestAmount;
  if (data.discountAmount) dbData.discount_amount = data.discountAmount;

  // Cleanup camelCase keys if needed, but Supabase ignores unknown columns mostly
  // Removing strictly to be clean would require omitting keys
  
  return dbData;
}

export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order('due_date', { ascending: true });
    
  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
}

// Alias
export const getAll = getAllPayments;

export async function getPaymentById(id: string): Promise<Payment> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Pagamento não encontrado");
  
  return mapPaymentFromDB(data);
}

// Alias
export const getById = getPaymentById;

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  const dbData = mapPaymentToDB(data);
  const result = await createSingle<any>(TABLE, dbData);
  return mapPaymentFromDB(result);
}

// Alias
export const create = createPayment;

export async function updatePayment(id: string, data: Partial<Payment>): Promise<Payment> {
  const dbData = mapPaymentToDB(data);
  const result = await updateSingle<any>(TABLE, id, dbData);
  return mapPaymentFromDB(result);
}

// Alias
export const update = updatePayment;

export async function deletePayment(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deletePayment;

export async function getPaymentsByRentalId(rentalId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq('rental_id', rentalId);
    
  if (error) throw error;
  return (data || []).map(mapPaymentFromDB);
}

// Alias
export const getByRentalId = getPaymentsByRentalId;

export async function deletePendingPaymentsByRentalId(rentalId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('rental_id', rentalId)
    .eq('status', 'pending');

  if (error) throw error;
}

// Alias
export const deletePendingByRentalId = deletePendingPaymentsByRentalId;

export async function deleteFuturePaymentsByRentalId(rentalId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('rental_id', rentalId)
    .eq('status', 'pending')
    .gt('due_date', today);

  if (error) throw error;
}

// Alias
export const deleteFutureByRentalId = deleteFuturePaymentsByRentalId;

export async function updateOverdueStatus(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', today);

  if (error) console.error("Erro ao atualizar status de pagamentos atrasados:", error);
}

// Métodos complexos de atualização em lote
export async function updateFuturePaymentsOnRentalValueChange(
  rentalId: string, 
  newAmount: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from(TABLE)
    .update({ expected_amount: newAmount })
    .eq('rental_id', rentalId)
    .eq('status', 'pending')
    .gt('due_date', today);

  if (error) throw error;
}

export async function updateFuturePaymentsOnPaymentDayChange(
  rentalId: string,
  newDay: number
): Promise<void> {
  console.log("Atualização de dia de pagamento em massa ainda não implementada no novo padrão");
}

export async function createPaymentsForRental(rental: any): Promise<void> {
  const startDate = new Date(rental.startDate);
  const endDate = rental.endDate ? new Date(rental.endDate) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  const paymentDay = rental.paymentDay;
  
  // Calculate months diff
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  // Add 1 to include the last month or ensure at least 12 months if indefinite
  const totalMonths = monthsDiff > 0 ? monthsDiff : 12;

  const payments = [];

  for (let i = 0; i < totalMonths; i++) {
    // Calculate reference date (first day of the month)
    const referenceDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    
    // Calculate due date (payment day of that month)
    const dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), paymentDay);
    
    // If payment day is invalid (e.g. 31st in Feb), it rolls over. Fix it to last day of month if needed
    if (dueDate.getMonth() !== referenceDate.getMonth()) {
      // Set to last day of previous month (which is the intended month)
      dueDate.setDate(0); 
    }

    payments.push({
      rentalId: rental.id,
      dueDate: dueDate.toISOString().split('T')[0],
      expectedAmount: rental.value,
      status: 'pending',
      referenceMonth: referenceDate.getMonth() + 1,
      referenceYear: referenceDate.getFullYear(),
    });
  }

  // Create all payments in parallel (or use a bulk insert if implemented, loop for now)
  // Ideally, supabase supports bulk insert. Let's use loop with Promise.all for now or bulk if createSingle supports array (it usually doesn't in this helpers pattern)
  // Actually, let's look at supabaseHelpers. createSingle is for one.
  // We should probably use supabase.from(TABLE).insert(dbData) for bulk.
  
  const dbPayments = payments.map(p => mapPaymentToDB(p));
  
  const { error } = await supabase
    .from(TABLE)
    .insert(dbPayments);

  if (error) {
    console.error("Erro ao criar pagamentos:", error);
    throw error;
  }
}