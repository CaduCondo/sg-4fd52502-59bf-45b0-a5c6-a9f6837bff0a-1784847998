import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";
import { cacheService } from "./cacheService";

/**
 * Helper para mapear dados do banco (snake_case) para interface Property (camelCase)
 */
const mapDatabaseProperty = (item: any): Property => {
  return {
    // IDs
    id: item.id,
    locationId: item.location_id,
    
    // Location name
    location: item.location_name || "",
    
    // Property details
    complement: item.complement,
    description: item.description,
    propertyIdentifier: item.property_identifier,
    
    // Numeric fields
    rooms: item.rooms,
    bathrooms: item.bathrooms,
    area: item.area,
    
    // Financial
    value: item.value,
    garageValue: item.garage_value,
    
    // Booleans
    hasGarage: item.has_garage || false,
    hasFurniture: item.has_furniture || false,
    acceptsPets: item.accepts_pets || false,
    
    // Status
    status: item.status as "available" | "occupied" | "unavailable",
    
    // Images
    images: Array.isArray(item.images) ? (item.images as string[]) : [],
    
    // Timestamps
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    
    // Location details (from JOIN)
    address: item.location_street,
    number: item.location_number,
    neighborhood: item.location_neighborhood,
    city: item.location_city,
    state: item.location_state,
    zipCode: item.location_zip_code,
    
    // Legacy compatibility
    bedrooms: item.rooms,
    monthlyRent: item.value,
    type: undefined,
  };
};

/**
 * Buscar todos os imóveis - OPTIMIZED VERSION
 * - Cache de 1 hora
 * - Query otimizada
 * - Fallback para cache em caso de erro
 */
export const getAll = async (): Promise<Property[]> => {
  const CACHE_KEY = "properties_all";
  const CACHE_TTL = 1000 * 60 * 60; // 1 hour (cache agressivo)

  try {
    console.log("=== FETCHING PROPERTIES (OPTIMIZED) ===");

    // Usar RPC otimizada ou query direta com índices
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        location_id,
        property_identifier,
        complement,
        description,
        rooms,
        bathrooms,
        area,
        has_garage,
        value,
        garage_value,
        status,
        images,
        has_furniture,
        accepts_pets,
        created_at,
        updated_at,
        locations!properties_location_id_fkey (
          id,
          name,
          street,
          number,
          neighborhood,
          city,
          state,
          zip_code
        )
      `)
      .order("created_at", { ascending: false })
      .limit(500); // Limite razoável

    if (error) throw error;

    const properties = (data || []).map((item) =>
      mapDatabaseProperty({
        ...item,
        location_name: item.locations?.name,
        location_street: item.locations?.street,
        location_number: item.locations?.number,
        location_neighborhood: item.locations?.neighborhood,
        location_city: item.locations?.city,
        location_state: item.locations?.state,
        location_zip_code: item.locations?.zip_code,
      })
    );

    console.log(`✅ Fetched ${properties.length} properties (optimized query)`);

    // Cache successful data
    cacheService.set(CACHE_KEY, properties, CACHE_TTL);

    return properties;
  } catch (error) {
    console.error("❌ Error fetching properties, trying cache fallback:", error);

    // Try to get from cache
    const cachedData = cacheService.get<Property[]>(CACHE_KEY);
    if (cachedData) {
      console.log(`✅ Using cached properties (${cachedData.length} items)`);
      return cachedData;
    }

    console.error("❌ No cached data available");
    throw error;
  }
};

/**
 * Buscar imóvel por ID - OPTIMIZED VERSION
 */
export const getById = async (id: string): Promise<Property | null> => {
  const CACHE_KEY = `property_${id}`;
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  console.log(`=== FETCHING PROPERTY BY ID: ${id} (OPTIMIZED) ===`);

  try {
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select(`
        id,
        location_id,
        property_identifier,
        complement,
        description,
        rooms,
        bathrooms,
        area,
        has_garage,
        value,
        garage_value,
        status,
        images,
        has_furniture,
        accepts_pets,
        created_at,
        updated_at,
        locations!properties_location_id_fkey (
          id,
          name,
          street,
          number,
          neighborhood,
          city,
          state,
          zip_code
        )
      `)
      .eq("id", id)
      .single();

    if (propertyError) throw propertyError;
    if (!propertyData) return null;

    const property = mapDatabaseProperty({
      ...propertyData,
      location_name: propertyData.locations?.name,
      location_street: propertyData.locations?.street,
      location_number: propertyData.locations?.number,
      location_neighborhood: propertyData.locations?.neighborhood,
      location_city: propertyData.locations?.city,
      location_state: propertyData.locations?.state,
      location_zip_code: propertyData.locations?.zip_code,
    });

    // Cache successful data
    cacheService.set(CACHE_KEY, property, CACHE_TTL);

    return property;
  } catch (error) {
    console.error("❌ Error fetching property, trying cache fallback:", error);

    // Try to get from cache
    const cachedData = cacheService.get<Property>(CACHE_KEY);
    if (cachedData) {
      console.log(`✅ Using cached property`);
      return cachedData;
    }

    console.error("❌ No cached data available");
    return null;
  }
};

/**
 * Criar novo imóvel
 */
export const create = async (property: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<Property> => {
  console.log("🔍 Creating property with data:", property);
  
  const { data, error } = await supabase
    .from("properties")
    .insert({
      location_id: property.locationId,
      complement: property.complement || null,
      value: property.value || 0,
      garage_value: property.garageValue || 0,
      status: property.status || "available",
      rooms: property.rooms || 0,
      bathrooms: property.bathrooms || 0,
      area: property.area || 0,
      description: property.description || null,
      images: property.images || [],
      has_partner_broker: property.hasPartnerBroker || false,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase error creating property:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    throw error;
  }

  console.log("✅ Property created successfully:", data);
  return mapDatabaseProperty(data);
};

/**
 * Atualizar imóvel existente
 */
export const update = async (id: string, property: Partial<Property>): Promise<Property> => {
  console.log("=== UPDATING PROPERTY ===");

  const propertyData = {
    location_id: property.locationId,
    property_identifier: property.propertyIdentifier,
    complement: property.complement,
    description: property.description,
    rooms: property.rooms,
    bathrooms: property.bathrooms,
    area: property.area,
    has_garage: property.hasGarage,
    value: property.value,
    garage_value: property.garageValue,
    status: property.status,
    images: property.images,
    has_furniture: property.hasFurniture,
    accepts_pets: property.acceptsPets,
  };

  const { data, error } = await supabase
    .from("properties")
    .update(propertyData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating property:", error);
    throw error;
  }

  // Invalidate cache
  cacheService.remove("properties_all");
  cacheService.remove(`property_${id}`);

  console.log("✅ Property updated successfully");
  return mapDatabaseProperty(data);
};

/**
 * Deletar imóvel
 */
export const remove = async (id: string): Promise<void> => {
  console.log("=== DELETING PROPERTY ===");
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) {
    console.error("Error deleting property:", error);
    throw error;
  }

  // Invalidate cache
  cacheService.remove("properties_all");
  cacheService.remove(`property_${id}`);
};