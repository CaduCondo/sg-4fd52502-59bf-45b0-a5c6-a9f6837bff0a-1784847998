import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/types";

export interface PropertyWithLocation extends Property {
  locationData?: {
    id: string;
    name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

export const propertyService = {
  async getAll(): Promise<PropertyWithLocation[]> {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        locationData:locations!properties_location_id_fkey (
          id,
          name,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          zip_code
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as PropertyWithLocation[];
  },

  async getById(id: string): Promise<PropertyWithLocation | null> {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        locationData:locations!properties_location_id_fkey (
          id,
          name,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          zip_code
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as PropertyWithLocation;
  },

  async create(property: Omit<Property, "id" | "created_at" | "updated_at">): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .insert([{
        location: property.location,
        location_id: property.location_id,
        property_identifier: property.property_identifier || "Apartamento",
        type: property.type,
        monthly_rent: property.monthly_rent,
        status: property.status,
        description: property.description,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  async update(id: string, property: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .update({
        location: property.location,
        location_id: property.location_id,
        property_identifier: property.property_identifier,
        type: property.type,
        monthly_rent: property.monthly_rent,
        status: property.status,
        description: property.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};