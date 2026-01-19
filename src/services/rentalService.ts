import { Rental } from "@/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle,
  getWithFilter 
} from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "rentals";

export async function getAllRentals(): Promise<Rental[]> {
  // Precisamos fazer o join manualmente ou configurar a view se quisermos dados aninhados
  // Por enquanto, vamos buscar os dados brutos e se necessário fazer fetch dos relacionamentos
  // O Supabase retorna os relacionamentos se solicitados
  
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      property:properties(*),
      tenant:tenants(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar aluguéis:", error);
    return [];
  }

  return data as Rental[];
}

// Alias
export const getAll = getAllRentals;

export async function getRentalById(id: string): Promise<Rental> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      property:properties(*),
      tenant:tenants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Aluguel não encontrado");

  return data as Rental;
}

// Alias
export const getById = getRentalById;

export async function createRental(data: Partial<Rental>): Promise<Rental> {
  return createSingle<Rental>(TABLE, data);
}

// Alias
export const create = createRental;

export async function updateRental(id: string, data: Partial<Rental>): Promise<Rental> {
  return updateSingle<Rental>(TABLE, id, data);
}

// Alias
export const update = updateRental;

export async function deleteRental(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deleteRental;