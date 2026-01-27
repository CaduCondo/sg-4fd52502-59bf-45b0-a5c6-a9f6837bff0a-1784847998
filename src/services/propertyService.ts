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
 * Buscar todos os imóveis (com dados de location)
 * USA NEXT.JS API ROUTE (sem tenant_id - não existe na tabela properties)
 */
export const getAll = async (): Promise<Property[]> => {
  try {
    console.log("=== FETCHING PROPERTIES VIA NEXT.JS API ROUTE ===");

    // Usar Next.js API Route SEM headers de autenticação
    // (A API não precisa de tenant_id porque properties não tem essa coluna)
    const response = await fetch("/api/properties", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const properties = result.properties || [];

    console.log(`✅ Fetched ${properties.length} properties via Next.js API Route`);

    return properties;
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
};

/**
 * Buscar imóvel por ID
 */
export const getById = async (id: string): Promise<Property | null> => {
  console.log(`=== FETCHING PROPERTY BY ID: ${id} ===`);

  try {
    // Query direta simples COM JOIN para pegar dados de location
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