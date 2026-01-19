import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";
import { Tables } from "@/integrations/supabase/types";

type PropertyRow = Tables<"properties"> & {
  locations?: Tables<"locations"> | null;
};

function mapPropertyFromDB(row: PropertyRow): Property {
  return {
    id: row.id,
    // Location info - mapped from join
    locationId: row.location_id,
    location: row.locations?.name, // Mapped name from joined table
    
    complement: row.complement || undefined,
    value: row.value || 0,
    status: (row.status as "available" | "occupied" | "unavailable") || "available",
    
    // Additional fields
    rooms: row.rooms || 0,
    bathrooms: row.bathrooms || 0,
    area: row.area || 0,
    hasGarage: row.has_garage || false,
    garageValue: row.garage_value || 0,
    description: row.description || undefined,
    propertyIdentifier: row.property_identifier || undefined,
    
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export async function createProperty(property: Partial<Property>) {
  const { data, error } = await supabase
    .from("properties")
    .insert({
      location_id: property.locationId,
      complement: property.complement || null,
      value: property.value,
      status: property.status || "available",
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      description: property.description,
    })
    .select("*, locations(*)")
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

// Alias for create
export const create = createProperty;

export async function getAll() {
  const { data, error } = await supabase
    .from("properties")
    .select("*, locations(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapPropertyFromDB);
}

// Alias for list
export const list = getAll;

export async function getById(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*, locations(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

export async function update(id: string, property: Partial<Property>) {
  const updateData: any = {};
  
  // Only update fields that are present
  if (property.locationId !== undefined) updateData.location_id = property.locationId;
  if (property.complement !== undefined) updateData.complement = property.complement;
  if (property.value !== undefined) updateData.value = property.value;
  if (property.status !== undefined) updateData.status = property.status;
  if (property.rooms !== undefined) updateData.rooms = property.rooms;
  if (property.bathrooms !== undefined) updateData.bathrooms = property.bathrooms;
  if (property.description !== undefined) updateData.description = property.description;

  const { data, error } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", id)
    .select("*, locations(*)")
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

// Alias for update
export const updateProperty = update;

export async function remove(id: string) {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Alias for remove
export const deleteProperty = remove;