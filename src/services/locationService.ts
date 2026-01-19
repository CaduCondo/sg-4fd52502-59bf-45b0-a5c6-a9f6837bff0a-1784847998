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
  return deleteSingle(TABLE, id);
}