import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";
import { cacheService } from "./cacheService";

// Cache em memória otimizado com chaves diferentes para listagem vs detalhes
let propertiesListCache: { data: Property[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const propertyDetailsCache: Map<string, { data: Property; timestamp: number }> = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const DETAILS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutos (detalhes mudam menos)

/**
 * Helper otimizado para mapear dados do banco (LISTAGEM - SEM IMAGES)
 */
const mapDatabasePropertyLight = (item: any): Property => {
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
    images: [], // VAZIO para listagem! Carrega só no detalhe
    createdAt: item.created_at,
    address: "",
    features: [],
  };
};

/**
 * Helper para mapear dados completos (DETALHES - COM IMAGES)
 */
const mapDatabasePropertyFull = (item: any): Property => {
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

/**
 * Invalidar cache quando houver mudanças
 */
const invalidateCache = () => {
  propertiesListCache = { data: null, timestamp: 0 };
  propertyDetailsCache.clear();
  cacheService.remove("properties_list");
  console.log("🗑️ [propertyService] Cache invalidado");
};

/**
 * Buscar todos os imóveis - QUERY ULTRA-OTIMIZADA (SEM IMAGES!)
 */
export const getAll = async (): Promise<Property[]> => {
  const now = Date.now();

  // Verificar cache em memória primeiro
  if (propertiesListCache.data && (now - propertiesListCache.timestamp) < CACHE_DURATION) {
    console.log("✅ [propertyService.getAll] Usando cache em memória");
    return propertiesListCache.data;
  }

  try {
    console.log("🔄 [propertyService.getAll] Buscando do banco...");

    // Query otimizada - SEM IMAGES para listagem rápida!
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        location_id,
        property_identifier,
        complement,
        rooms,
        bathrooms,
        value,
        status,
        has_furniture,
        accepts_pets,
        area,
        has_garage,
        created_at,
        locations!properties_location_id_fkey(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const properties = (data || []).map((item) =>
      mapDatabasePropertyLight({
        ...item,
        location_name: item.locations?.name,
      })
    );

    console.log(`✅ [propertyService.getAll] ${properties.length} imóveis retornados (sem imagens)`);

    // Atualizar cache em memória
    propertiesListCache = { data: properties, timestamp: now };

    // Cache no localStorage (fallback)
    cacheService.set("properties_list", properties, CACHE_DURATION);

    return properties;
  } catch (error) {
    console.error("❌ Error fetching properties:", error);
    
    // Tentar usar cache expirado como fallback
    if (propertiesListCache.data) {
      console.log("⚠️ Usando cache expirado como fallback");
      return propertiesListCache.data;
    }

    // Último recurso: cache do localStorage
    const cachedData = cacheService.get<Property[]>("properties_list");
    if (cachedData) {
      console.log("⚠️ Usando cache do localStorage como fallback");
      return cachedData;
    }

    throw error;
  }
};

/**
 * Buscar imóvel por ID - QUERY COMPLETA COM IMAGES
 */
export const getById = async (id: string): Promise<Property | null> => {
  const now = Date.now();

  // Verificar cache em memória primeiro
  const cached = propertyDetailsCache.get(id);
  if (cached && (now - cached.timestamp) < DETAILS_CACHE_DURATION) {
    console.log(`✅ [propertyService.getById] Usando cache para ${id}`);
    return cached.data;
  }

  try {
    console.log(`🔄 [propertyService.getById] Buscando ${id} do banco...`);

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

    const property = mapDatabasePropertyFull({
      ...data,
      location_name: data.locations?.name,
    });

    // Atualizar cache em memória
    propertyDetailsCache.set(id, { data: property, timestamp: now });

    console.log(`✅ [propertyService.getById] Imóvel ${id} retornado (com imagens)`);

    return property;
  } catch (error) {
    console.error("Error fetching property:", error);
    
    // Tentar usar cache expirado
    const cached = propertyDetailsCache.get(id);
    if (cached) {
      console.log("⚠️ Usando cache expirado como fallback");
      return cached.data;
    }

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
      locations!properties_location_id_fkey(name)
    `)
    .single();

  if (error) throw error;

  // Invalidate cache
  invalidateCache();

  return mapDatabasePropertyFull({
    ...data,
    location_name: data.locations?.name,
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
    .single();

  if (error) throw error;

  // Invalidate cache
  invalidateCache();

  return mapDatabasePropertyFull({
    ...data,
    location_name: data.locations?.name,
  });
};

/**
 * Deletar imóvel
 */
export const remove = async (id: string): Promise<void> => {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;

  // Invalidate cache
  invalidateCache();
};

/**
 * Buscar imóveis disponíveis - QUERY OTIMIZADA (SEM IMAGES)
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
    images: [], // SEM IMAGES para listagem rápida
  })) as Property[];
};

/**
 * Buscar imóveis para página pública - COM IMAGES otimizadas
 * Apenas imóveis disponíveis, com apenas a primeira imagem para performance
 */
export const getPublicProperties = async (): Promise<Property[]> => {
  try {
    console.log("🔄 [propertyService.getPublicProperties] Buscando imóveis públicos...");

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
        locations!properties_location_id_fkey(id, name, city, neighborhood, state)
      `)
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const properties = (data || []).map((item) => {
      // Processar imagens: pegar todas mas apenas as que existem
      let images: string[] = [];
      if (item.images) {
        if (Array.isArray(item.images)) {
          images = item.images.filter((img: any) => img && typeof img === 'string');
        }
      }

      return {
        id: item.id,
        locationId: item.location_id,
        location: item.locations?.name || "",
        city: item.locations?.city || "",
        neighborhood: item.locations?.neighborhood || "",
        state: item.locations?.state || "",
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
        images: images,
        createdAt: item.created_at,
        address: "",
        features: [],
      } as Property;
    });

    console.log(`✅ [propertyService.getPublicProperties] ${properties.length} imóveis públicos retornados`);
    console.log(`📸 Imagens carregadas:`, properties.map(p => ({ id: p.id, imageCount: p.images.length })));

    return properties;
  } catch (error) {
    console.error("❌ Error fetching public properties:", error);
    throw error;
  }
};