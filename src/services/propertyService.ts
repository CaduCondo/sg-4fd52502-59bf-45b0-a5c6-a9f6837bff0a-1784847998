import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export async function getAllProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapPropertyFromDB);
}

// Alias for compatibility
export const getAll = getAllProperties;

export async function getPropertyById(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

// Alias for compatibility
export const getById = getPropertyById;

export async function createProperty(property: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<Property> {
  // Ensure values are numbers
  const rooms = Number(property.rooms) || 0;
  const bathrooms = Number(property.bathrooms) || 0;
  // Ensure value is stored as cents (integer)
  const value = Math.round(Number(property.value) * 100);

  const { data, error } = await supabase
    .from("properties")
    .insert([{
      location_id: property.locationId,
      complement: property.complement,
      rooms: rooms,
      bathrooms: bathrooms,
      value: value,
      description: property.description,
      status: property.status,
    }])
    .select()
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

// Alias for compatibility
export const create = createProperty;

export async function updateProperty(id: string, property: Partial<Property>): Promise<Property> {
  const updateData: any = {};
  
  if (property.locationId !== undefined) updateData.location_id = property.locationId;
  if (property.complement !== undefined) updateData.complement = property.complement;
  if (property.rooms !== undefined) updateData.rooms = Number(property.rooms) || 0;
  if (property.bathrooms !== undefined) updateData.bathrooms = Number(property.bathrooms) || 0;
  // Ensure value is stored as cents (integer)
  if (property.value !== undefined) updateData.value = Math.round(Number(property.value) * 100);
  if (property.description !== undefined) updateData.description = property.description;
  if (property.status !== undefined) updateData.status = property.status;

  const { data, error } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

// Alias for compatibility
export const update = updateProperty;

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Alias for compatibility
export const remove = deleteProperty;

function mapPropertyFromDB(data: Database["public"]["Tables"]["properties"]["Row"]): Property {
  return {
    id: data.id,
    locationId: data.location_id,
    complement: data.complement || "",
    rooms: Number(data.rooms) || 0,
    bathrooms: Number(data.bathrooms) || 0,
    // Convert from cents to currency units (float)
    value: data.value ? data.value / 100 : 0,
    description: data.description || "",
    status: data.status as Property["status"],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}