import { Location } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "locations";

export async function getAllLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching locations:", error);
    throw error;
  }

  return (data || []).map(dbLocation => ({
    id: dbLocation.id,
    name: dbLocation.name,
    street: dbLocation.street || "",
    number: dbLocation.number || "",
    complement: dbLocation.complement || "",
    neighborhood: dbLocation.neighborhood || "",
    city: dbLocation.city,
    state: dbLocation.state,
    zip_code: dbLocation.zip_code || "",
    is_active: dbLocation.is_active,
    active: dbLocation.is_active,
    address: `${dbLocation.street || ''}, ${dbLocation.number || ''} - ${dbLocation.neighborhood || ''}, ${dbLocation.city || ''} - ${dbLocation.state || ''}`,
    manager_id: null,
    created_at: dbLocation.created_at,
    updated_at: dbLocation.updated_at,
  }));
}

export const getAll = getAllLocations;
export const getLocations = getAllLocations;

export async function getById(id: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching location ${id}:`, error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    street: data.street || "",
    number: data.number || "",
    complement: data.complement || "",
    neighborhood: data.neighborhood || "",
    city: data.city,
    state: data.state,
    zip_code: data.zip_code || "",
    is_active: data.is_active,
    active: data.is_active,
    address: `${data.street || ''}, ${data.number || ''} - ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}`,
    manager_id: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getLocationById(id: string): Promise<Location> {
  const location = await getById(id);
  if (!location) throw new Error("Local não encontrado");
  return location;
}

export async function createLocation(locationData: {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_active?: boolean;
}): Promise<Location> {
  console.log("Creating location with data:", locationData);

  const dbLocation = {
    name: locationData.name.trim(),
    street: locationData.street.trim(),
    number: locationData.number.trim(),
    complement: locationData.complement?.trim() || null,
    neighborhood: locationData.neighborhood.trim(),
    city: locationData.city.trim(),
    state: locationData.state.trim().toUpperCase(),
    zip_code: locationData.zip_code.replace(/\D/g, ""),
    is_active: locationData.is_active !== false,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(dbLocation)
    .select()
    .single();

  if (error) {
    console.error("Error creating location:", error);
    throw error;
  }

  console.log("Location created successfully:", data.id);

  return {
    id: data.id,
    name: data.name,
    street: data.street || "",
    number: data.number || "",
    complement: data.complement || "",
    neighborhood: data.neighborhood || "",
    city: data.city,
    state: data.state,
    zip_code: data.zip_code || "",
    is_active: data.is_active,
    active: data.is_active,
    address: `${data.street || ''}, ${data.number || ''} - ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}`,
    manager_id: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateLocation(
  id: string,
  updates: {
    name?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    is_active?: boolean;
  }
): Promise<Location> {
  console.log(`Updating location ${id} with:`, updates);

  const dbUpdates: any = {};
  
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.street !== undefined) dbUpdates.street = updates.street.trim();
  if (updates.number !== undefined) dbUpdates.number = updates.number.trim();
  if (updates.complement !== undefined) dbUpdates.complement = updates.complement?.trim() || null;
  if (updates.neighborhood !== undefined) dbUpdates.neighborhood = updates.neighborhood.trim();
  if (updates.city !== undefined) dbUpdates.city = updates.city.trim();
  if (updates.state !== undefined) dbUpdates.state = updates.state.trim().toUpperCase();
  if (updates.zip_code !== undefined) dbUpdates.zip_code = updates.zip_code.replace(/\D/g, "");
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

  const { data, error } = await supabase
    .from(TABLE)
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating location ${id}:`, error);
    throw error;
  }

  console.log(`Location ${id} updated successfully`);

  return {
    id: data.id,
    name: data.name,
    street: data.street || "",
    number: data.number || "",
    complement: data.complement || "",
    neighborhood: data.neighborhood || "",
    city: data.city,
    state: data.state,
    zip_code: data.zip_code || "",
    is_active: data.is_active,
    active: data.is_active,
    address: `${data.street || ''}, ${data.number || ''} - ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}`,
    manager_id: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function deleteLocation(id: string): Promise<void> {
  console.log(`[DELETE] Iniciando exclusão PERMANENTE do local ${id}`);
  
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`[DELETE ERROR] Falha ao deletar local ${id}:`, error.message);
    throw error;
  }
  
  console.log(`[DELETE SUCCESS] Local ${id} removido permanentemente do banco de dados`);
}