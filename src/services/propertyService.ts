import { Property } from "@/types";
import { Database } from "@/integrations/supabase/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "properties";

export async function getAllProperties(): Promise<Property[]> {
  return fetchAll<Property>(TABLE);
}

// Alias
export const getAll = getAllProperties;

export async function getPropertyById(id: string): Promise<Property> {
  return getSingle<Property>(TABLE, id);
}

// Alias
export const getById = getPropertyById;

export async function createProperty(data: Partial<Property>): Promise<Property> {
  return createSingle<Property>(TABLE, data);
}

// Alias
export const create = createProperty;

export async function updateProperty(id: string, data: Partial<Property>): Promise<Property> {
  return updateSingle<Property>(TABLE, id, data);
}

// Alias
export const update = updateProperty;

export async function deleteProperty(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deleteProperty;

export async function create(property: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .insert([{
      location_id: property.locationId,
      complement: property.complement,
      rooms: Number(property.rooms) || 0,
      bathrooms: Number(property.bathrooms) || 0,
      value: Number(property.value) * 100, // Ensure number
      description: property.description,
      status: property.status,
    }])
    .select()
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

export async function update(id: string, property: Partial<Property>): Promise<Property> {
  const updateData: any = {}; // Use any to bypass strict type check for partial updates
  
  if (property.locationId !== undefined) updateData.location_id = property.locationId;
  if (property.complement !== undefined) updateData.complement = property.complement;
  if (property.rooms !== undefined) updateData.rooms = Number(property.rooms) || 0;
  if (property.bathrooms !== undefined) updateData.bathrooms = Number(property.bathrooms) || 0;
  if (property.value !== undefined) updateData.value = Number(property.value) * 100;
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

function mapPropertyFromDB(data: Database["public"]["Tables"]["properties"]["Row"]): Property {
  return {
    id: data.id,
    locationId: data.location_id,
    complement: data.complement || "",
    rooms: data.rooms || "",
    bathrooms: data.bathrooms || "",
    value: data.value / 100, // Convert from cents to currency
    description: data.description || "",
    status: data.status as Property["status"],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}