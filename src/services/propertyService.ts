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
 * Helper para processar imagens do JSONB do Supabase
 */
const processImages = (images: any): string[] => {
  if (!images) {
    return [];
  }
  
  // Se já é um array
  if (Array.isArray(images)) {
    // Filtrar e validar imagens de forma otimizada
    const validImages: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img && typeof img === 'string' && img.length > 0) {
        validImages.push(img);
      }
    }
    return validImages;
  }
  
  return [];
};

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
    images: processImages(item.images),
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
 * Buscar todos os imóveis - COM IMAGE_COUNT (ultra-rápido, sem timeout)
 */
export const getAll = async (): Promise<Property[]> => {
  const now = Date.now();

  // Verificar cache em memória primeiro
  if (propertiesListCache.data && (now - propertiesListCache.timestamp) < CACHE_DURATION) {
    console.log("✅ [propertyService.getAll] Usando cache em memória");
    return propertiesListCache.data;
  }

  try {
    console.log("🔄 [propertyService.getAll] Buscando do banco COM IMAGE_COUNT (ultra-rápido)...");

    // 🔥 QUERY COM IMAGE_COUNT - apenas um número INTEGER, não JSONB!
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
        value,
        status,
        has_garage,
        has_furniture,
        accepts_pets,
        image_count,
        created_at
      `) as any; // Type assertion temporária até regenerar tipos

    if (error) throw error;

    // Buscar nomes das locations em paralelo (query separada mais rápida)
    const locationIds = [...new Set((data || []).map((p: any) => p.location_id).filter(Boolean))];
    
    const { data: locationsData } = await supabase
      .from("locations")
      .select("id, name")
      .in("id", locationIds);

    const locationsMap = new Map((locationsData || []).map(loc => [loc.id, loc.name]));

    const properties = (data || []).map((item: any) => {
      // 🔥 Criar array vazio com length correto baseado em image_count
      const imageCount = item.image_count || 0;
      const images: string[] = imageCount > 0 ? new Array(imageCount).fill('') : [];
      
      return {
        id: item.id,
        locationId: item.location_id,
        location: locationsMap.get(item.location_id) || "",
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
        images: images, // 🔥 Array vazio com length correto (ícone funciona!)
        createdAt: item.created_at,
        address: "",
        features: [],
      };
    });

    console.log(`✅ [propertyService.getAll] ${properties.length} imóveis retornados (COM contadores de imagens)`);

    // Atualizar cache em memória
    propertiesListCache = { data: properties, timestamp: now };

    return properties;
  } catch (error) {
    console.error("❌ Error fetching properties:", error);
    
    // Tentar usar cache expirado como fallback
    if (propertiesListCache.data) {
      console.log("⚠️ Usando cache expirado como fallback");
      return propertiesListCache.data;
    }

    throw error;
  }
};

/**
 * Buscar imóvel por ID - QUERY COMPLETA COM IMAGES (só quando abrir detalhes)
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
    console.log(`🔄 [propertyService.getById] Buscando ${id} COM IMAGENS...`);

    // 🔥 Query simples SEM JOIN para evitar timeout
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
        updated_at
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Buscar location separadamente
    const { data: locationData } = await supabase
      .from("locations")
      .select("name")
      .eq("id", data.location_id)
      .single();

    const property = mapDatabasePropertyFull({
      ...data,
      location_name: locationData?.name,
    });

    // Atualizar cache em memória
    propertyDetailsCache.set(id, { data: property, timestamp: now });

    console.log(`✅ [propertyService.getById] Imóvel ${id} retornado (com ${property.images.length} imagens)`);

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
}

/**
 * PÁGINA PÚBLICA - QUERY COM IMAGENS (limit 10 para máxima velocidade)
 */
export const getPublicProperties = async (): Promise<Property[]> => {
  try {
    console.log("🔄 [getPublicProperties] Iniciando busca COM IMAGENS...");

    // 🔥 Query COM IMAGES mas limit MUITO pequeno (10) para máxima velocidade
    // SEM timeout local - deixa Supabase gerenciar (15-20s)
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
        value,
        status,
        has_garage,
        has_furniture,
        accepts_pets,
        images,
        created_at
      `)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(10); // 🔥 Apenas 10 imóveis para máxima velocidade

    if (error) {
      console.error("❌ Erro na query:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Nenhum imóvel disponível");
      return [];
    }

    console.log(`✅ ${data.length} imóveis carregados COM IMAGENS`);

    // Buscar locations em query separada
    const locationIds = [...new Set(data.map(p => p.location_id).filter(Boolean))];
    
    if (locationIds.length === 0) {
      console.log("⚠️ Nenhuma localização encontrada");
      return data.map(item => ({
        id: item.id,
        locationId: item.location_id,
        location: "",
        city: "",
        neighborhood: "",
        state: "",
        address: "",
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
        images: processImages(item.images),
        createdAt: item.created_at,
        features: [],
      }));
    }

    // Query de locations (sem timeout)
    const { data: locationsData } = await supabase
      .from("locations")
      .select("id, name, city, neighborhood, state, street, number")
      .in("id", locationIds);

    const locationsMap = new Map(
      (locationsData || []).map(loc => [loc.id, loc])
    );

    const properties = data.map((item) => {
      const location = locationsMap.get(item.location_id) as any;
      
      // Montar endereço
      const addressParts = [];
      if (location?.street) addressParts.push(location.street);
      if (location?.number) addressParts.push(location.number);
      const address = addressParts.join(", ");

      return {
        id: item.id,
        locationId: item.location_id,
        location: location?.name || "",
        city: location?.city || "",
        neighborhood: location?.neighborhood || "",
        state: location?.state || "",
        address: address,
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
        images: processImages(item.images),
        createdAt: item.created_at,
        features: [],
      } as Property;
    });

    console.log(`✅ [getPublicProperties] ${properties.length} imóveis retornados COM IMAGENS`);

    return properties;

  } catch (error: any) {
    console.error("❌ [getPublicProperties] Erro crítico:", error);
    
    // 🔥 FALLBACK FINAL: retornar array vazio em vez de travar
    console.log("⚠️ Retornando lista vazia como fallback");
    return [];
  }
};