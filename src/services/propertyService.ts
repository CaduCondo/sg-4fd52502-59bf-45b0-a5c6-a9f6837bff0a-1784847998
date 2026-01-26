import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";
import { Tables } from "@/integrations/supabase/types";

type PropertyRow = Tables<"properties">;
type LocationRow = Tables<"locations">;

function mapPropertyFromDB(row: PropertyRow, location?: LocationRow | null): Property {
  return {
    id: row.id,
    locationId: row.location_id,
    location: location?.name,
    address: location?.street || undefined,
    number: location?.number || undefined,
    neighborhood: location?.neighborhood || undefined,
    city: location?.city || undefined,
    state: location?.state || undefined,
    zipCode: location?.zip_code || undefined,
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
    .select("*")
    .single();

  if (error) throw error;

  // Fetch location separately
  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", data.location_id)
    .single();

  return mapPropertyFromDB(data, location);
}

export const create = createProperty;

export async function getAll() {
  // Query 1: Fetch all properties (simple, fast)
  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (propertiesError) throw propertiesError;

  if (!properties || properties.length === 0) {
    return [];
  }

  // Query 2: Fetch locations for these properties (batch fetch)
  const locationIds = [...new Set(properties.map(p => p.location_id))];
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("*")
    .in("id", locationIds);

  if (locationsError) throw locationsError;

  // Create lookup map for fast access
  const locationsMap = new Map(locations?.map(loc => [loc.id, loc]) || []);

  // Merge properties with their locations
  return properties.map(prop => mapPropertyFromDB(prop, locationsMap.get(prop.location_id)));
}

export const list = getAll;

export async function getById(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  // Fetch location separately
  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", data.location_id)
    .single();

  return mapPropertyFromDB(data, location);
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
    .select("*")
    .single();

  if (error) throw error;

  // Fetch location separately
  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", data.location_id)
    .single();

  return mapPropertyFromDB(data, location);
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
    console.log("=== PROPERTY SERVICE: getAll (optimized) ===");
    
    // Query 1: Fetch properties only (no JOIN)
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (propertiesError) {
      console.error("Error fetching properties:", propertiesError);
      throw propertiesError;
    }

    if (!properties || properties.length === 0) {
      console.log("No properties found");
      return [];
    }

    console.log(`Fetched ${properties.length} properties`);

    // Query 2: Fetch locations separately (batch fetch for efficiency)
    const locationIds = [...new Set(properties.map(p => p.location_id))];
    console.log(`Fetching ${locationIds.length} unique locations`);

    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("*")
      .in("id", locationIds);

    if (locationsError) {
      console.error("Error fetching locations:", locationsError);
      throw locationsError;
    }

    console.log(`Fetched ${locations?.length || 0} locations`);

    // Create lookup map for O(1) access
    const locationsMap = new Map(locations?.map(loc => [loc.id, loc]) || []);

    // Merge data in frontend
    const result = properties.map((property) => {
      const location = locationsMap.get(property.location_id);
      
      return {
        id: property.id,
        locationId: property.location_id,
        location: location?.name || "",
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
      };
    });

    console.log("Properties merged with locations successfully");
    return result;
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
      .select("*")
      .single();

    if (error) {
      console.error("Error creating property:", error);
      throw error;
    }
    
    console.log("5. Property created successfully!");
    console.log("   - Saved data.value:", data.value);
    
    // Fetch location separately
    const { data: location } = await supabase
      .from("locations")
      .select("*")
      .eq("id", data.location_id)
      .single();
    
    const result: Property = {
      id: data.id,
      locationId: data.location_id,
      location: location?.name || "",
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
      .select("*")
      .single();

    if (error) {
      console.error("Error updating property:", error);
      throw error;
    }
    
    console.log("5. Property updated successfully!");
    console.log("   - Saved data.value:", data.value);
    
    // Fetch location separately
    const { data: location } = await supabase
      .from("locations")
      .select("*")
      .eq("id", data.location_id)
      .single();
    
    const result: Property = {
      id: data.id,
      locationId: data.location_id,
      location: location?.name || "",
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