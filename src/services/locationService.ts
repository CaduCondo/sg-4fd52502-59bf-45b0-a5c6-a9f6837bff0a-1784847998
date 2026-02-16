import { Location } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { 
  updateSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "locations";

const mapLocationFromDb = (data: any): Location => ({
  id: data.id,
  name: data.name,
  city: data.city,
  state: data.state,
  zip_code: data.zip_code,
  street: data.street,
  number: data.number,
  neighborhood: data.neighborhood,
  complement: data.complement,
  is_active: data.is_active,
  active: data.is_active,
  address: `${data.street || ''}, ${data.number || ''} - ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}`,
  manager_id: null,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export async function getAllLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data || []).map(mapLocationFromDb);
}

// Alias for compatibility
export const getAll = getAllLocations;

export const getById = async (id: string): Promise<Location | null> => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data ? mapLocationFromDb(data) : null;
};

export const getLocations = getAllLocations;

export async function getLocationById(id: string): Promise<Location> {
  const location = await getById(id);
  if (!location) throw new Error("Local não encontrado");
  return location;
}

export async function createLocation(location: Omit<Location, "id" | "created_at" | "updated_at" | "address" | "manager_id" | "active">): Promise<Location> {
  const dbLocation = {
    name: location.name,
    street: location.street,
    number: location.number,
    complement: location.complement,
    neighborhood: location.neighborhood,
    city: location.city,
    state: location.state,
    zip_code: location.zip_code,
    is_active: location.is_active,
  };

  const { data, error } = await supabase
    .from("locations")
    .insert(dbLocation)
    .select()
    .single();

  if (error) throw error;
  return mapLocationFromDb(data);
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
  return updateSingle<Location>(TABLE, id, updates);
}

export async function deleteLocation(id: string): Promise<void> {
  console.log(`Iniciando exclusão (soft delete) do local com ID: ${id}`);
  
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