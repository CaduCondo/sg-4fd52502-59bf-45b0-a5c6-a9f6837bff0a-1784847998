import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/types";

export const propertyService = {
  async getAll(): Promise<Property[]> {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
        throw error;
      }

      return (data || []).map((item) => this.mapFromDB(item));
    } catch (error) {
      console.error("Error in getAll:", error);
      throw error;
    }
  },

  async getById(id: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching property:", error);
        throw error;
      }

      return data ? this.mapFromDB(data) : null;
    } catch (error) {
      console.error("Error in getById:", error);
      throw error;
    }
  },

  async create(property: Partial<Property>): Promise<Property> {
    try {
      const propertyData = this.mapToDB(property);
      
      const { data, error } = await supabase
        .from("properties")
        .insert(propertyData)
        .select()
        .single();

      if (error) {
        console.error("Error creating property:", error);
        throw error;
      }

      return this.mapFromDB(data);
    } catch (error) {
      console.error("Error in create:", error);
      throw error;
    }
  },

  async update(id: string, property: Partial<Property>): Promise<Property> {
    try {
      const propertyData = this.mapToDB(property);
      
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

      return this.mapFromDB(data);
    } catch (error) {
      console.error("Error in update:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting property:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
  },

  mapToDB(property: any): any {
    console.log("🔵 mapToDB - Input:", property);
    
    // Mapeia APENAS os campos que existem na tabela properties
    const dbData = {
      location_id: property.locationId || null,
      location: property.location || "",
      type: property.type || "residential",
      monthly_rent: property.monthlyRent || 0,
      status: property.status || "available",
      description: property.description || null,
      property_identifier: property.propertyIdentifier || null,
    };
    
    console.log("🔵 mapToDB - Output:", dbData);
    return dbData;
  },

  mapFromDB(data: any): Property {
    console.log("🟢 mapFromDB - Input:", data);
    
    // Mapeia os dados do banco para o tipo Property
    const property: Property = {
      id: data.id,
      locationId: data.location_id,
      location: data.location || "",
      name: data.location || "Sem nome",
      type: data.type || "residential",
      monthlyRent: Number(data.monthly_rent) || 0,
      status: data.status || "available",
      description: data.description || "",
      propertyIdentifier: data.property_identifier || "",
      // Campos que não estão em properties (valores padrão)
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      rentValue: Number(data.monthly_rent) || 0,
      size: 0,
      rooms: 0,
      bathrooms: 0,
      parkingSpots: 0,
      images: [],
      features: [],
      createdAt: data.created_at,
    };
    
    console.log("🟢 mapFromDB - Output:", property);
    return property;
  },
};