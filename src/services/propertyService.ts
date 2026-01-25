import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";
import { Tables } from "@/integrations/supabase/types";

type PropertyRow = Tables<"properties"> & {
  locations?: Tables<"locations"> | null;
};

function mapPropertyFromDB(row: PropertyRow): Property {
  return {
    id: row.id,
    locationId: row.location_id,
    location: row.locations?.name,
    address: row.locations?.street || undefined,
    number: row.locations?.number || undefined,
    neighborhood: row.locations?.neighborhood || undefined,
    city: row.locations?.city || undefined,
    state: row.locations?.state || undefined,
    zipCode: row.locations?.zip_code || undefined,
    complement: row.complement || undefined,
    value: row.value || 0,
    status: (row.status as "available" | "occupied" | "unavailable") || "available",
    rooms: row.rooms || 0,
    bathrooms: row.bathrooms || 0,
    area: row.area || 0,
    hasGarage: row.has_garage || false,
    garageValue: row.garage_value || 0,
    description: row.description || undefined,
    propertyIdentifier: row.property_identifier || undefined,
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
      area: property.area,
      description: property.description,
      images: property.images || [],
      has_furniture: property.hasFurniture || false,
      accepts_pets: property.acceptsPets || false,
      has_garage: property.hasGarage || false,
    })
    .select("*, locations(*)")
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

export const create = createProperty;

export async function getAll() {
  const { data, error } = await supabase
    .from("properties")
    .select("*, locations(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapPropertyFromDB);
}

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
  
  if (property.locationId !== undefined) updateData.location_id = property.locationId;
  if (property.complement !== undefined) updateData.complement = property.complement;
  if (property.value !== undefined) updateData.value = property.value;
  if (property.status !== undefined) updateData.status = property.status;
  if (property.rooms !== undefined) updateData.rooms = property.rooms;
  if (property.bathrooms !== undefined) updateData.bathrooms = property.bathrooms;
  if (property.area !== undefined) updateData.area = property.area;
  if (property.description !== undefined) updateData.description = property.description;
  if (property.images !== undefined) updateData.images = property.images;
  if (property.hasFurniture !== undefined) updateData.has_furniture = property.hasFurniture;
  if (property.acceptsPets !== undefined) updateData.accepts_pets = property.acceptsPets;
  if (property.hasGarage !== undefined) updateData.has_garage = property.hasGarage;

  const { data, error } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", id)
    .select("*, locations(*)")
    .single();

  if (error) throw error;
  return mapPropertyFromDB(data);
}

export const updateProperty = update;

export async function remove(id: string) {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

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
      images: Array.isArray(property.images) ? property.images as string[] : [],
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
    console.log("Creating property with area:", property.area);
    
    console.log("=== PROPERTY SERVICE CREATE DEBUG ===");
    console.log("1. property.monthlyRent received:", property.monthlyRent);
    console.log("2. property.value received:", property.value);
    
    const rentValue = property.monthlyRent || property.value || 0;
    console.log("3. Final rentValue to save:", rentValue);
    
    const insertData = {
      location_id: property.locationId,
      property_identifier: property.propertyIdentifier || "Apartamento",
      complement: property.complement,
      rooms: property.rooms || 0,
      bathrooms: property.bathrooms || 0,
      value: rentValue,
      status: property.status || "available",
      description: property.description,
      images: property.images || [],
      has_furniture: property.hasFurniture || false,
      accepts_pets: property.acceptsPets || false,
      area: property.area || 0,
      has_garage: property.hasGarage || false,
    };
    
    console.log("4. insertData being sent to Supabase:", insertData);
    console.log("   - insertData.value:", insertData.value);

    const { data, error } = await supabase
      .from("properties")
      .insert(insertData)
      .select(`
        *,
        locations!properties_location_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error("Error creating property:", error);
      throw error;
    }
    
    console.log("5. Property created successfully!");
    console.log("   - Saved data.value:", data.value);
    
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
      images: Array.isArray(data.images) ? data.images as string[] : [],
      hasFurniture: data.has_furniture || false,
      has_furniture: data.has_furniture || false,
      acceptsPets: data.accepts_pets || false,
      accepts_pets: data.accepts_pets || false,
      area: data.area || 0,
      hasGarage: data.has_garage || false,
      createdAt: data.created_at,
    };
    
    console.log("Returning property with area:", result.area);
    
    return result;
  },

  async update(id: string, property: Partial<Property>): Promise<Property> {
    console.log("Updating property with area:", property.area);
    
    console.log("=== PROPERTY SERVICE UPDATE DEBUG ===");
    console.log("1. property.value received:", property.value);
    console.log("2. property.monthlyRent received:", property.monthlyRent);
    
    const rentValue = property.value || property.monthlyRent || 0;
    console.log("3. Final rentValue to save:", rentValue);
    
    const updateData = {
      location_id: property.locationId,
      property_identifier: property.propertyIdentifier,
      complement: property.complement,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      value: rentValue,
      status: property.status,
      description: property.description,
      images: property.images,
      has_furniture: property.hasFurniture,
      accepts_pets: property.acceptsPets,
      area: property.area,
      has_garage: property.hasGarage,
    };
    
    console.log("4. updateData being sent to Supabase:", updateData);
    console.log("   - updateData.value:", updateData.value);

    const { data, error } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        locations!properties_location_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error("Error updating property:", error);
      throw error;
    }
    
    console.log("5. Property updated successfully!");
    console.log("   - Saved data.value:", data.value);
    
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
      images: Array.isArray(data.images) ? data.images as string[] : [],
      hasFurniture: data.has_furniture || false,
      has_furniture: data.has_furniture || false,
      acceptsPets: data.accepts_pets || false,
      accepts_pets: data.accepts_pets || false,
      area: data.area || 0,
      hasGarage: data.has_garage || false,
      createdAt: data.created_at,
    };
    
    console.log("Returning property with area:", result.area);
    
    return result;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) throw error;
  },
};