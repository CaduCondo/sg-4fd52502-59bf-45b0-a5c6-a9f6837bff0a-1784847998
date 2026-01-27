import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";

// Função helper para mapear retorno do banco para interface Property
const mapDatabaseProperty = (item: any): Property => {
  return {
    id: item.id,
    locationId: item.location_id,
    location: item.location_name || item.location?.name || "", // Suporta retorno RPC ou Join
    complement: item.complement,
    description: item.description,
    type: item.type,
    rooms: item.rooms,
    bedrooms: item.rooms, // Alias
    bathrooms: item.bathrooms,
    area: item.area,
    hasGarage: item.has_garage,
    value: item.value,
    monthlyRent: item.monthly_rent,
    garageValue: item.garage_value,
    status: item.status as "available" | "occupied" | "unavailable",
    propertyIdentifier: item.property_identifier,
    images: Array.isArray(item.images) ? (item.images as string[]) : [],
    hasFurniture: item.has_furniture || false,
    acceptsPets: item.accepts_pets || false,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    // Location details
    address: item.location_street || item.location?.street,
    number: item.location_number || item.location?.number,
    neighborhood: item.location_neighborhood || item.location?.neighborhood,
    city: item.location_city || item.location?.city,
    state: item.location_state || item.location?.state,
    zipCode: item.location_zip_code || item.location?.zip_code,
  };
};

export const propertyService = {
  /**
   * Buscar todos os imóveis usando RPC otimizada
   * Bypassa PostgREST que está causando timeout
   */
  getAll: async (): Promise<Property[]> => {
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
  },

  /**
   * Buscar imóvel por ID
   */
  getById: async (id: string): Promise<Property | null> => {
    console.log(`=== FETCHING PROPERTY BY ID: ${id} ===`);

    try {
      // Tenta buscar via RPC primeiro filtrando pelo ID (reusa a lógica otimizada)
      const { data, error } = await supabase.rpc("get_properties_with_locations", {
        p_location_id: null, // Opcional
        p_status: null       // Opcional
        // Nota: A RPC atual não tem filtro por property ID, então vamos usar o método tradicional
        // mas otimizado sem joins desnecessários se possível, ou manter o fallback.
      });
      
      // Se a RPC não suporta filtro por ID, voltamos ao método tradicional mas com cuidado
      // Vamos usar a query direta no banco que é segura para 1 registro
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

      // Mapear dados do formato Join para Property
      // O helper mapDatabaseProperty lida com a estrutura aninhada de locations também
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
  },

  /**
   * Criar novo imóvel
   */
  create: async (property: Partial<Property>): Promise<Property> => {
    console.log("=== CREATING PROPERTY ===");
    
    const propertyData = {
      location_id: property.locationId,
      property_identifier: property.propertyIdentifier || "Apartamento",
      complement: property.complement,
      description: property.description,
      type: property.type,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      area: property.area,
      has_garage: property.hasGarage,
      value: property.value,
      monthly_rent: property.monthlyRent || property.value,
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

    // Para retornar o objeto completo com dados da location, o ideal seria buscar novamente
    // Mas para performance, vamos retornar o que temos + dados parciais
    return mapDatabaseProperty(data);
  },

  /**
   * Atualizar imóvel existente
   */
  update: async (id: string, property: Partial<Property>): Promise<Property> => {
    console.log("=== UPDATING PROPERTY ===");

    const propertyData = {
      location_id: property.locationId,
      property_identifier: property.propertyIdentifier,
      complement: property.complement,
      description: property.description,
      type: property.type,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      area: property.area,
      has_garage: property.hasGarage,
      value: property.value,
      monthly_rent: property.monthlyRent || property.value,
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

    return mapDatabaseProperty(data);
  },

  /**
   * Deletar imóvel
   */
  remove: async (id: string): Promise<void> => {
    console.log("=== DELETING PROPERTY ===");
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      console.error("Error deleting property:", error);
      throw error;
    }
  },
};