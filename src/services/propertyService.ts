import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";

/**
 * Helper para mapear dados do banco (snake_case) para interface Property (camelCase)
 * IMPORTANTE: Mapeia apenas campos que REALMENTE EXISTEM no banco de dados
 */
const mapDatabaseProperty = (item: any): Property => {
  return {
    // IDs
    id: item.id,
    locationId: item.location_id,
    
    // Location name (from JOIN or RPC)
    location: item.location_name || "",
    
    // Property details (CAMPOS REAIS DO BANCO)
    complement: item.complement,
    description: item.description,
    propertyIdentifier: item.property_identifier,
    
    // Numeric fields (CAMPOS REAIS DO BANCO)
    rooms: item.rooms, // Total de cômodos (não é "bedrooms")
    bathrooms: item.bathrooms,
    area: item.area,
    
    // Financial (CAMPOS REAIS DO BANCO)
    value: item.value, // Valor principal do imóvel
    garageValue: item.garage_value,
    
    // Booleans (CAMPOS REAIS DO BANCO)
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
    
    // CAMPOS LEGADOS (para compatibilidade com código antigo)
    // Estes NÃO existem no banco, mas o código antigo pode esperar eles
    bedrooms: item.rooms, // Alias para 'rooms' (compatibilidade)
    monthlyRent: item.value, // Alias para 'value' (compatibilidade)
    type: undefined, // Não existe no banco
  };
};

/**
 * Buscar todos os imóveis usando RPC otimizada
 * Bypassa PostgREST que está causando timeout
 */
export const getAll = async (): Promise<Property[]> => {
  console.log("=== FETCHING ALL PROPERTIES VIA RPC (get_properties_with_locations) ===");
  
  try {
    // Chama a função RPC criada no banco
    const { data, error } = await supabase.rpc("get_properties_with_locations");

    if (error) {
      console.error("RPC Error:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} properties via RPC`);

    return (data || []).map(mapDatabaseProperty);
  } catch (error) {
    console.error("Error fetching properties via RPC:", error);
    throw error;
  }
};

/**
 * Buscar imóvel por ID
 */
export const getById = async (id: string): Promise<Property | null> => {
  console.log(`=== FETCHING PROPERTY BY ID: ${id} ===`);

  try {
    // Tenta buscar via RPC primeiro filtrando pelo ID (reusa a lógica otimizada)
    // A RPC espera parâmetros opcionais, então podemos chamar assim
    const { data, error } = await supabase.rpc("get_properties_with_locations");
    
    if (!error && data) {
       const found = data.find((p: any) => p.id === id);
       if (found) return mapDatabaseProperty(found);
    }
    
    // Fallback: Query direta simples se RPC falhar ou não achar (embora RPC traga tudo, filtrar em memória é rápido para 34 itens)
    // Para 34 itens, filtrar em memória a RPC é mais rápido que fazer outra request complexa
    
    // Se precisarmos de fallback para query direta:
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select(`
        *,
        locations (
          id, name, street, number, neighborhood, city, state, zip_code
        )
      `)
      .eq("id", id)
      .single();

    if (propertyError) {
      console.error("Error fetching property:", propertyError);
      return null;
    }

    if (!propertyData) return null;

    return mapDatabaseProperty({
      ...propertyData,
      location_name: propertyData.locations?.name,
      location_street: propertyData.locations?.street,
      location_number: propertyData.locations?.number,
      location_neighborhood: propertyData.locations?.neighborhood,
      location_city: propertyData.locations?.city,
      location_state: propertyData.locations?.state,
      location_zip_code: propertyData.locations?.zip_code
    });

  } catch (error) {
    console.error("Error in getById:", error);
    return null;
  }
};

/**
 * Criar novo imóvel
 */
export const create = async (property: Partial<Property>): Promise<Property> => {
  console.log("=== CREATING PROPERTY ===");
  
  // Mapear apenas campos que REALMENTE EXISTEM no banco
  const propertyData = {
    location_id: property.locationId,
    property_identifier: property.propertyIdentifier || "Apartamento",
    complement: property.complement,
    description: property.description,
    // CAMPOS REAIS DO BANCO:
    rooms: property.rooms, // NÃO usar 'bedrooms'
    bathrooms: property.bathrooms,
    area: property.area,
    has_garage: property.hasGarage,
    value: property.value, // NÃO usar 'monthlyRent'
    garage_value: property.garageValue,
    status: property.status || "available",
    images: property.images || [],
    has_furniture: property.hasFurniture || false,
    accepts_pets: property.acceptsPets || false,
  };

  const { data, error } = await supabase
    .from("properties")
    .insert(propertyData)
    .select()
    .single();

  if (error) {
    console.error("Error creating property:", error);
    throw error;
  }

  console.log("✅ Property created successfully");
  return mapDatabaseProperty(data);
};

/**
 * Atualizar imóvel existente
 */
export const update = async (id: string, property: Partial<Property>): Promise<Property> => {
  console.log("=== UPDATING PROPERTY ===");

  // Mapear apenas campos que REALMENTE EXISTEM no banco
  const propertyData = {
    location_id: property.locationId,
    property_identifier: property.propertyIdentifier,
    complement: property.complement,
    description: property.description,
    // CAMPOS REAIS DO BANCO:
    rooms: property.rooms, // NÃO usar 'bedrooms'
    bathrooms: property.bathrooms,
    area: property.area,
    has_garage: property.hasGarage,
    value: property.value, // NÃO usar 'monthlyRent'
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
};