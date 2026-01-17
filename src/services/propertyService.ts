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
    
    const dbData = {
      location: property.location || "",
      address: property.address || "",
      number: property.number || "",
      complement: property.complement || null,
      neighborhood: property.neighborhood || null,
      city: property.city || null,
      state: property.state || null,
      cep: property.zipCode || property.cep || null,
      zip_code: property.zipCode || property.cep || null,
      monthly_rent: property.monthlyRent || property.rentValue || 0,
      type: property.type || "residential",
      status: property.status || "available",
      description: property.description || null,
    };
    
    console.log("🔵 mapToDB - Output:", dbData);
    return dbData;
  },

  mapFromDB(data: any): Property {
    console.log("🟢 mapFromDB - Input:", data);
    
    const property = {
      id: data.id,
      name: `${data.location || ""} ${data.number || ""}`.trim() || "Sem nome",
      address: data.address || "",
      location: data.location || "",
      number: data.number || "",
      complement: data.complement || "",
      neighborhood: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
      zipCode: data.zip_code || data.cep || "",
      monthlyRent: Number(data.monthly_rent) || 0,
      rentValue: Number(data.monthly_rent) || 0,
      size: 0,
      rooms: 0,
      bathrooms: 0,
      parkingSpots: 0,
      type: data.type || "residential",
      status: data.status || "available",
      description: data.description || "",
      images: [],
      features: [],
      createdAt: data.created_at,
    };
    
    console.log("🟢 mapFromDB - Output:", property);
    return property;
  },
};