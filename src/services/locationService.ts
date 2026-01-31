import { Location } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { 
  getAll as fetchAll, 
  createSingle, 
  updateSingle, 
  deleteSingle,
  getSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "locations";

export async function getAllLocations(): Promise<Location[]> {
  return fetchAll<Location>(TABLE);
}

// Alias for compatibility
export const getAll = async (): Promise<Location[]> => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true) // ✅ Filtra apenas ativos
    .order("name");

  if (error) throw error;
  return data;
};

export const getById = async (id: string): Promise<Location | null> => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const getLocations = getAllLocations;

export async function getLocationById(id: string): Promise<Location> {
  const location = await getSingle<Location>(TABLE, id);
  if (!location) throw new Error("Local não encontrado");
  return location;
}

export async function createLocation(location: Omit<Location, "id" | "created_at" | "updated_at">): Promise<Location> {
  return createSingle<Location>(TABLE, location);
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
  return updateSingle<Location>(TABLE, id, updates);
}

export async function deleteLocation(id: string): Promise<void> {
  console.log(`Iniciando exclusão (soft delete) do local com ID: ${id}`);
  
  // ✅ Usa UPDATE para desativar em vez de DELETE físico
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error(`Erro ao desativar local com ID ${id}: ${error.message}`);
    throw error;
  }
  console.log(`Local com ID ${id} desativado com sucesso`);
}