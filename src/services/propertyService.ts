import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/types";

export const propertyService = {
  async getAll(): Promise<Property[]> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapFromDatabase);
  },

  async getById(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? this.mapFromDatabase(data) : null;
  },

  async create(property: Omit<Property, "id" | "createdAt">): Promise<Property> {
    const dbProperty = this.mapToDatabase(property);
    
    const { data, error } = await supabase
      .from("properties")
      .insert(dbProperty)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  },

  async update(property: Property): Promise<Property> {
    const dbProperty = this.mapToDatabase(property);
    
    const { data, error } = await supabase
      .from("properties")
      .update(dbProperty)
      .eq("id", property.id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Map database fields (snake_case) to TypeScript interface (camelCase)
  mapFromDatabase(dbProperty: any): Property {
    return {
      id: dbProperty.id,
      location: dbProperty.location,
      cep: dbProperty.cep || undefined,
      address: dbProperty.address,
      number: dbProperty.number,
      complement: dbProperty.complement || "",
      neighborhood: dbProperty.neighborhood || undefined,
      city: dbProperty.city || undefined,
      state: dbProperty.state || undefined,
      type: dbProperty.type,
      monthlyRent: parseFloat(dbProperty.monthly_rent),
      rentValue: parseFloat(dbProperty.monthly_rent),
      status: dbProperty.status,
      description: dbProperty.description || undefined,
      createdAt: dbProperty.created_at,
    };
  },

  // Map TypeScript interface (camelCase) to database fields (snake_case)
  mapToDatabase(property: Partial<Property>): any {
    const dbProperty: any = {};
    
    if (property.location !== undefined) dbProperty.location = property.location;
    if (property.cep !== undefined) dbProperty.cep = property.cep;
    if (property.address !== undefined) dbProperty.address = property.address;
    if (property.number !== undefined) dbProperty.number = property.number;
    if (property.complement !== undefined) dbProperty.complement = property.complement;
    if (property.neighborhood !== undefined) dbProperty.neighborhood = property.neighborhood;
    if (property.city !== undefined) dbProperty.city = property.city;
    if (property.state !== undefined) dbProperty.state = property.state;
    if (property.type !== undefined) dbProperty.type = property.type;
    if (property.monthlyRent !== undefined) dbProperty.monthly_rent = property.monthlyRent;
    if (property.rentValue !== undefined) dbProperty.monthly_rent = property.rentValue;
    if (property.status !== undefined) dbProperty.status = property.status;
    if (property.description !== undefined) dbProperty.description = property.description;
    
    return dbProperty;
  }
};