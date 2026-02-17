import { Location } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const TABLE = "locations";

/**
 * Get all locations from the database (no filtering - shows all records)
 * Since we use hard delete, all records in DB are valid
 */
export async function getAllLocations(): Promise<Location[]> {
  console.log("[locationService] Fetching all locations from database...");
  
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name");

  if (error) {
    console.error("[locationService] Error fetching locations:", error);
    throw error;
  }

  console.log(`[locationService] Loaded ${data?.length || 0} locations from database`);

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
    is_active: dbLocation.is_active !== false, // Default to true if not set
    active: dbLocation.is_active !== false,
    address: `${dbLocation.street || ''}, ${dbLocation.number || ''} - ${dbLocation.neighborhood || ''}, ${dbLocation.city || ''} - ${dbLocation.state || ''}`,
    manager_id: null,
    created_at: dbLocation.created_at,
    updated_at: dbLocation.updated_at,
  }));
}

export const getAll = getAllLocations;
export const getLocations = getAllLocations;

/**
 * Get a single location by ID
 */
export async function getById(id: string): Promise<Location | null> {
  console.log(`[locationService] Fetching location by ID: ${id}`);
  
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`[locationService] Error fetching location ${id}:`, error);
    throw error;
  }

  if (!data) {
    console.log(`[locationService] Location ${id} not found`);
    return null;
  }

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
    is_active: data.is_active !== false,
    active: data.is_active !== false,
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

/**
 * Create a new location
 */
export async function createLocation(locationData: {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}): Promise<Location> {
  console.log("[locationService] Creating new location:", locationData.name);

  const dbLocation = {
    name: locationData.name.trim(),
    street: locationData.street.trim(),
    number: locationData.number.trim(),
    complement: locationData.complement?.trim() || null,
    neighborhood: locationData.neighborhood.trim(),
    city: locationData.city.trim(),
    state: locationData.state.trim().toUpperCase(),
    zip_code: locationData.zip_code.replace(/\D/g, ""),
    is_active: true, // Always create as active
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(dbLocation)
    .select()
    .single();

  if (error) {
    console.error("[locationService] Error creating location:", error);
    throw error;
  }

  console.log("[locationService] Location created successfully:", data.id);

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
    is_active: data.is_active !== false,
    active: data.is_active !== false,
    address: `${data.street || ''}, ${data.number || ''} - ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}`,
    manager_id: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Update an existing location
 */
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
  }
): Promise<Location> {
  console.log(`[locationService] Updating location ${id}`);

  const dbUpdates: any = {};
  
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.street !== undefined) dbUpdates.street = updates.street.trim();
  if (updates.number !== undefined) dbUpdates.number = updates.number.trim();
  if (updates.complement !== undefined) dbUpdates.complement = updates.complement?.trim() || null;
  if (updates.neighborhood !== undefined) dbUpdates.neighborhood = updates.neighborhood.trim();
  if (updates.city !== undefined) dbUpdates.city = updates.city.trim();
  if (updates.state !== undefined) dbUpdates.state = updates.state.trim().toUpperCase();
  if (updates.zip_code !== undefined) dbUpdates.zip_code = updates.zip_code.replace(/\D/g, "");

  const { data, error } = await supabase
    .from(TABLE)
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`[locationService] Error updating location ${id}:`, error);
    throw error;
  }

  console.log(`[locationService] Location ${id} updated successfully`);

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
    is_active: data.is_active !== false,
    active: data.is_active !== false,
    address: `${data.street || ''}, ${data.number || ''} - ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}`,
    manager_id: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * HARD DELETE - Permanently remove a location from the database
 * This will CASCADE delete related records (expenses, permissions, etc.)
 */
export async function deleteLocation(id: string): Promise<void> {
  console.log(`[locationService] HARD DELETE - Permanently removing location: ${id}`);
  
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`[locationService] Failed to delete location ${id}:`, error.message);
    throw error;
  }
  
  console.log(`[locationService] Location ${id} permanently deleted from database`);
}