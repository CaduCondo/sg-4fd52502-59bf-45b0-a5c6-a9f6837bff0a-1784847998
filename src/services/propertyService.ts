import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";
import { cacheService } from "./cacheService";

/**
 * Helper optimizado para mapear dados do banco para interface Property
 * Busca APENAS campos essenciais
 */
const mapDatabaseProperty = (item: any): Property => {
  return {
    id: item.id,
    locationId: item.location_id,
    location: item.location_name || "",
    propertyIdentifier: item.property_identifier || "",
    complement: item.complement || "",
    description: item.description || "",
    rooms: item.rooms || 0,
    bathrooms: item.bathrooms || 0,
    area: item.area || 0,
    value: item.value || 0,
    hasGarage: item.has_garage || false,
    hasFurniture: item.has_furniture || false,
    acceptsPets: item.accepts_pets || false,
    status: item.status as "available" | "occupied" | "unavailable",
    images: Array.isArray(item.images) ? (item.images as string[]) : [],
    createdAt: item.created_at,
    address: "",
    features: [],
  };
};

const mapPropertyFromDb = (data: any): Property => {
  return {
    id: data.id,
    locationId: data.location_id,
    location: data.locations?.name || "",
    propertyIdentifier: data.property_identifier,
    complement: data.complement,
    rooms: data.rooms,
    bathrooms: data.bathrooms,
    area: data.area,
    value: data.value,
    hasGarage: data.has_garage,
    hasFurniture: data.has_furniture,
    acceptsPets: data.accepts_pets,
    description: data.description,
    status: data.status,
    images: data.images || [],
    createdAt: data.created_at,
    address: data.locations?.address || "",
    features: data.features || [],
    locationDetails: data.locations,
  };
};

/**
 * Buscar todos os imóveis - QUERY ULTRA-OTIMIZADA
 */
export const getAll = async (): Promise<Property[]> => {
  const CACHE_KEY = "properties_all";
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

  try {
    // Query otimizada - apenas campos essenciais
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        locations(id, name, street, number, neighborhood, city, state, zip_code)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const properties = (data || []).map((item) =>
      mapDatabaseProperty({
        ...item,
        location_name: item.locations?.name,
      })
    );

    cacheService.set(CACHE_KEY, properties, CACHE_TTL);
    return properties;
  } catch (error) {
    console.error("Error fetching properties:", error);
    const cachedData = cacheService.get<Property[]>(CACHE_KEY);
    if (cachedData) return cachedData;
    throw error;
  }
};

/**
 * Buscar imóvel por ID - QUERY OTIMIZADA
 */
export const getById = async (id: string): Promise<Property | null> => {
  const CACHE_KEY = `property_${id}`;
  const CACHE_TTL = 1000 * 60 * 15; // 15 minutos

  try {
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
        status,
        images,
        has_furniture,
        accepts_pets,
        created_at,
        updated_at,
        locations!properties_location_id_fkey(name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const property = mapDatabaseProperty({
      ...data,
      location_name: data.locations?.name,
    });

    cacheService.set(CACHE_KEY, property, CACHE_TTL);
    return property;
  } catch (error) {
    console.error("Error fetching property:", error);
    const cachedData = cacheService.get<Property>(CACHE_KEY);
    if (cachedData) return cachedData;
    return null;
  }
};

/**
 * Criar novo imóvel
 */
export const create = async (property: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<Property> => {
  const { data, error } = await supabase
    .from("properties")
    .insert({
      location_id: property.locationId,
      property_identifier: property.propertyIdentifier || null,
      complement: property.complement || null,
      value: property.value || 0,
      status: property.status || "available",
      rooms: property.rooms || 0,
      bathrooms: property.bathrooms || 0,
      area: property.area || 0,
      has_garage: property.hasGarage || false,
      description: property.description || null,
      images: property.images || [],
      has_furniture: property.hasFurniture || false,
      accepts_pets: property.acceptsPets || false,
    })
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
      status,
      images,
      has_furniture,
      accepts_pets,
      created_at,
      updated_at,
      locations!properties_location_id_fkey(name, street, number)
    `)
    .single();

  if (error) throw error;

  // Invalidate cache
  cacheService.remove("properties_all");

  return mapDatabaseProperty({
    ...data,
    location_name: data.locations?.name,
    location_street: data.locations?.street,
    location_number: data.locations?.number,
  });
};

/**
 * Atualizar imóvel existente
 */
export const update = async (id: string, property: Partial<Property>): Promise<Property> => {
  const propertyData: any = {};

  if (property.locationId !== undefined) propertyData.location_id = property.locationId;
  if (property.propertyIdentifier !== undefined) propertyData.property_identifier = property.propertyIdentifier;
  if (property.complement !== undefined) propertyData.complement = property.complement;
  if (property.description !== undefined) propertyData.description = property.description;
  if (property.rooms !== undefined) propertyData.rooms = property.rooms;
  if (property.bathrooms !== undefined) propertyData.bathrooms = property.bathrooms;
  if (property.area !== undefined) propertyData.area = property.area;
  if (property.hasGarage !== undefined) propertyData.has_garage = property.hasGarage;
  if (property.value !== undefined) propertyData.value = property.value;
  if (property.status !== undefined) propertyData.status = property.status;
  if (property.images !== undefined) propertyData.images = property.images;
  if (property.hasFurniture !== undefined) propertyData.has_furniture = property.hasFurniture;
  if (property.acceptsPets !== undefined) propertyData.accepts_pets = property.acceptsPets;

  const { data, error } = await supabase
    .from("properties")
    .update(propertyData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Invalidate cache
  cacheService.remove("properties_all");
  cacheService.remove(`property_${id}`);

  return mapDatabaseProperty(data);
};

/**
 * Deletar imóvel
 */
export const remove = async (id: string): Promise<void> => {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;

  // Invalidate cache
  cacheService.remove("properties_all");
  cacheService.remove(`property_${id}`);
};

/**
 * Buscar imóveis disponíveis - QUERY OTIMIZADA
 */
export async function getAvailable(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(`
      id,
      location_id,
      property_identifier,
      complement,
      value,
      status,
      locations!properties_location_id_fkey(id, name)
    `)
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((property: any) => ({
    id: property.id,
    locationId: property.location_id,
    location: property.locations?.name || "",
    propertyIdentifier: property.property_identifier || "",
    complement: property.complement || "",
    value: property.value || 0,
    status: property.status,
  })) as Property[];
}