import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/types";

export const propertyService = {
  async getAll(): Promise<Property[]> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("location", { ascending: true });
    
    if (error) throw error;
    return data.map(this.mapFromDB);
  },

  async getById(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data ? this.mapFromDB(data) : null;
  },

  async create(property: Omit<Property, "id" | "createdAt">): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .insert([this.mapToDB(property)])
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async update(property: Property): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .update({
        ...this.mapToDB(property),
        updated_at: new Date().toISOString()
      })
      .eq("id", property.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  mapFromDB(data: any): Property {
    return {
      id: data.id,
      name: data.name || "",
      address: data.address || "",
      location: data.location || "",
      number: data.number || "",
      complement: data.complement || "",
      neighborhood: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
      cep: data.cep || "",
      zipCode: data.zip_code || "",
      
      // Required fields with defaults
      type: data.type || "residential",
      size: data.size || 0,
      rooms: data.rooms || 0,
      bathrooms: data.bathrooms || 0,
      parkingSpots: data.parking_spots || 0,
      
      monthlyRent: data.monthly_rent || 0,
      rentValue: data.rent_value || 0,
      
      description: data.description || "",
      status: (data.status as any) || "available",
      images: data.images || [],
      features: data.features || [],
      
      createdAt: data.created_at,
    };
  },

  mapToDB(property: any): any {
    return {
      location: property.location,
      address: property.address || "",
      number: property.number || "",
      complement: property.complement,
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      zip_code: property.zipCode || "",
      cep: property.zipCode || "",
      monthly_rent: property.monthlyRent,
      type: property.type,
      status: property.status,
      description: property.description
    };
  }
};