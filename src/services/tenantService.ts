import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/types";

export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) throw error;
    return (data || []).map(this.mapFromDB);
  },

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data ? this.mapFromDB(data) : null;
  },

  async create(tenant: Omit<Tenant, "id" | "createdAt">): Promise<Tenant> {
    const { data, error } = await supabase
      .from("tenants")
      .insert([this.mapToDB(tenant)])
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async update(tenant: Tenant): Promise<Tenant> {
    const { data, error } = await supabase
      .from("tenants")
      .update(this.mapToDB(tenant))
      .eq("id", tenant.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  mapFromDB(data: any): Tenant {
    return {
      id: data.id,
      name: data.name,
      document: data.document || data.cpf || "",
      documentType: data.document_type || "cpf",
      cpf: data.cpf || data.document || "",
      email: data.email,
      phone: data.phone,
      status: data.status,
      createdAt: data.created_at
    };
  },

  mapToDB(tenant: any): any {
    return {
      name: tenant.name,
      document: tenant.document,
      document_type: tenant.documentType,
      cpf: tenant.documentType === 'cpf' ? tenant.document : null,
      email: tenant.email || null,
      phone: tenant.phone || null,
      status: tenant.status || "active"
    };
  }
};