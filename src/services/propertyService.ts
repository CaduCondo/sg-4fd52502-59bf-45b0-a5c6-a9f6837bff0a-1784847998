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
    address: row.locations?.street || undefined,
    number: row.locations?.number || undefined,
    neighborhood: row.locations?.neighborhood || undefined,
    city: row.locations?.city || undefined,
    state: row.locations?.state || undefined,
    zipCode: row.locations?.zip_code || undefined,
    
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
    
    // Novos campos
    images: (row.images as string[]) || [],
    hasFurniture: row.has_furniture || false,
    acceptsPets: row.accepts_pets || false,
    
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
      images: property.images || [],
      has_furniture: property.hasFurniture || false,
      accepts_pets: property.acceptsPets || false,
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
  if (property.images !== undefined) updateData.images = property.images;
  if (property.hasFurniture !== undefined) updateData.has_furniture = property.hasFurniture;
  if (property.acceptsPets !== undefined) updateData.accepts_pets = property.acceptsPets;

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

export const propertyService = {
  async getAll(): Promise<Property[]> {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        locations!properties_location_id_fkey (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((property) => ({
      id: property.id,
      locationId: property.location_id,
      location: property.locations?.name || "",
      propertyIdentifier: property.property_identifier || "",
      complement: property.complement || "",
      rooms: property.rooms || 0,
      bathrooms: property.bathrooms || 0,
      value: property.value || 0,
      monthly_rent: property.value || 0,
      status: (property.status as "available" | "occupied" | "unavailable") || "available",
      description: property.description || "",
      images: (property.images as unknown as string[]) || [],
      hasFurniture: property.has_furniture || false,
      has_furniture: property.has_furniture || false,
      acceptsPets: property.accepts_pets || false,
      accepts_pets: property.accepts_pets || false,
      area: property.area || 0,
      hasGarage: property.has_garage || false,
      createdAt: property.created_at,
    }));
  },

  async create(property: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .insert({
        location_id: property.locationId,
        property_identifier: property.propertyIdentifier || "Apartamento",
        complement: property.complement,
        rooms: property.rooms || 0,
        bathrooms: property.bathrooms || 0,
        value: property.monthlyRent || property.value || 0,
        status: property.status || "available",
        description: property.description,
        images: property.images || [],
        has_furniture: property.hasFurniture || false,
        accepts_pets: property.acceptsPets || false,
        area: property.area || 0,
        has_garage: property.hasGarage || false,
      })
      .select(`
        *,
        locations!properties_location_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;
    
    // Mapeamento manual para garantir conformidade com a interface Property
    const result: Property = {
      id: data.id,
      locationId: data.location_id,
      location: data.locations?.name || "",
      propertyIdentifier: data.property_identifier || "",
      complement: data.complement || "",
      rooms: data.rooms || 0,
      bathrooms: data.bathrooms || 0,
      value: data.value || 0,
      monthly_rent: data.value || 0,
      status: (data.status as "available" | "occupied" | "unavailable") || "available",
      description: data.description || "",
      images: (data.images as unknown as string[]) || [],
      hasFurniture: data.has_furniture || false,
      has_furniture: data.has_furniture || false,
      acceptsPets: data.accepts_pets || false,
      accepts_pets: data.accepts_pets || false,
      area: data.area || 0,
      hasGarage: data.has_garage || false,
      createdAt: data.created_at,
    };
    
    return result;
  },

  async update(id: string, property: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .update({
        location_id: property.locationId,
        property_identifier: property.propertyIdentifier,
        complement: property.complement,
        rooms: property.rooms,
        bathrooms: property.bathrooms,
        value: property.value || property.monthly_rent,
        status: property.status,
        description: property.description,
        images: property.images,
        has_furniture: property.hasFurniture,
        accepts_pets: property.acceptsPets,
        area: property.area,
        has_garage: property.hasGarage,
      })
      .eq("id", id)
      .select(`
        *,
        locations!properties_location_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;
    
    // Mapeamento manual para garantir conformidade com a interface Property
    const result: Property = {
      id: data.id,
      locationId: data.location_id,
      location: data.locations?.name || "",
      propertyIdentifier: data.property_identifier || "",
      complement: data.complement || "",
      rooms: data.rooms || 0,
      bathrooms: data.bathrooms || 0,
      value: data.value || 0,
      monthly_rent: data.value || 0,
      status: (data.status as "available" | "occupied" | "unavailable") || "available",
      description: data.description || "",
      images: (data.images as unknown as string[]) || [],
      hasFurniture: data.has_furniture || false,
      has_furniture: data.has_furniture || false,
      acceptsPets: data.accepts_pets || false,
      accepts_pets: data.accepts_pets || false,
      area: data.area || 0,
      hasGarage: data.has_garage || false,
      createdAt: data.created_at,
    };
    
    return result;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) throw error;
  },
};
