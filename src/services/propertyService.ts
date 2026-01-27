import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";

export const propertyService = {
  /**
   * Buscar todos os imóveis usando RPC otimizada
   * Bypassa PostgREST que está causando timeout
   */
  getAll: async (): Promise<Property[]> => {
    console.log("=== FETCHING ALL PROPERTIES VIA RPC ===");
    
    try {
      const { data, error } = await supabase.rpc("get_all_properties");

      if (error) {
        console.error("RPC Error:", error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} properties via RPC`);

      // Mapear dados para o formato Property
      const mappedProperties: Property[] = (data || []).map((item: any) => ({
        id: item.id,
        locationId: item.location_id,
        location: item.location_name,
        complement: item.complement,
        description: item.description,
        type: item.type,
        rooms: item.rooms,
        bedrooms: item.rooms,
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
        // Location data
        address: item.location_street,
        number: item.location_number,
        neighborhood: item.location_neighborhood,
        city: item.location_city,
        state: item.location_state,
        zipCode: item.location_zip_code,
      }));

      return mappedProperties;
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

    // Buscar property
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (propertyError || !propertyData) {
      console.error("Error fetching property:", propertyError);
      return null;
    }

    // Buscar location
    let locationData = null;
    if (propertyData.location_id) {
      const { data: loc } = await supabase
        .from("locations")
        .select("*")
        .eq("id", propertyData.location_id)
        .single();
      locationData = loc;
    }

    const property: Property = {
      id: propertyData.id,
      locationId: propertyData.location_id,
      location: locationData?.name || "",
      complement: propertyData.complement,
      description: propertyData.description,
      type: propertyData.type,
      rooms: propertyData.rooms,
      bedrooms: propertyData.rooms,
      bathrooms: propertyData.bathrooms,
      area: propertyData.area,
      hasGarage: propertyData.has_garage,
      value: propertyData.value,
      monthlyRent: propertyData.monthly_rent,
      garageValue: propertyData.garage_value,
      status: propertyData.status,
      propertyIdentifier: propertyData.property_identifier,
      images: Array.isArray(propertyData.images) ? (propertyData.images as string[]) : [],
      hasFurniture: propertyData.has_furniture || false,
      acceptsPets: propertyData.accepts_pets || false,
      createdAt: propertyData.created_at,
      updatedAt: propertyData.updated_at,
      // Location data
      address: locationData?.street,
      number: locationData?.number,
      neighborhood: locationData?.neighborhood,
      city: locationData?.city,
      state: locationData?.state,
      zipCode: locationData?.zip_code,
    };

    return property;
  },

  /**
   * Criar novo imóvel
   */
  create: async (property: Partial<Property>): Promise<Property> => {
    console.log("=== CREATING PROPERTY ===");
    console.log("Property data:", property);

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

    console.log("Sending to database:", propertyData);

    const { data, error } = await supabase
      .from("properties")
      .insert(propertyData)
      .select()
      .single();

    if (error) {
      console.error("Error creating property:", error);
      throw error;
    }

    console.log("✅ Property created successfully:", data);
    return data as Property;
  },

  /**
   * Atualizar imóvel existente
   */
  update: async (id: string, property: Partial<Property>): Promise<Property> => {
    console.log("=== UPDATING PROPERTY ===");
    console.log("Property ID:", id);
    console.log("Update data:", property);

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

    console.log("Sending to database:", propertyData);

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

    console.log("✅ Property updated successfully:", data);
    return data as Property;
  },

  /**
   * Deletar imóvel
   */
  remove: async (id: string): Promise<void> => {
    console.log("=== DELETING PROPERTY ===");
    console.log("Property ID:", id);

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      console.error("Error deleting property:", error);
      throw error;
    }

    console.log("✅ Property deleted successfully");
  },
};