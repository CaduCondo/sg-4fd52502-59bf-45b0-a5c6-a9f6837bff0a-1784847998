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
      location: data.location,
      address: data.address,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      cep: data.zip_code || data.cep || "",
      zipCode: data.zip_code || data.cep || "",
      monthlyRent: parseFloat(data.monthly_rent) || 0,
      rentValue: parseFloat(data.monthly_rent) || 0,
      type: data.type,
      status: data.status,
      description: data.description,
      createdAt: data.created_at
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