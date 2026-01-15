import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/types";

export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapFromDatabase);
  },

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? this.mapFromDatabase(data) : null;
  },

  async create(tenant: Omit<Tenant, "id" | "createdAt">): Promise<Tenant> {
    const dbTenant = this.mapToDatabase(tenant);
    
    const { data, error } = await supabase
      .from("tenants")
      .insert(dbTenant)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  },

  async update(tenant: Tenant): Promise<Tenant> {
    const dbTenant = this.mapToDatabase(tenant);
    
    const { data, error } = await supabase
      .from("tenants")
      .update(dbTenant)
      .eq("id", tenant.id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Map database fields (snake_case) to TypeScript interface (camelCase)
  mapFromDatabase(dbTenant: any): Tenant {
    return {
      id: dbTenant.id,
      name: dbTenant.name,
      documentType: dbTenant.document_type || "cpf",
      document: dbTenant.document || dbTenant.cpf || "",
      rg: dbTenant.rg || null,
      email: dbTenant.email,
      phone: dbTenant.phone,
      status: dbTenant.status,
      cep: dbTenant.cep || null,
      address: dbTenant.address || null,
      number: dbTenant.number || null,
      complement: dbTenant.complement || null,
      city: dbTenant.city || null,
      state: dbTenant.state || null,
      description: dbTenant.description || null,
      createdAt: dbTenant.created_at,
      cpf: dbTenant.document_type === "cpf" ? dbTenant.document : null,
    };
  },

  // Map TypeScript interface (camelCase) to database fields (snake_case)
  mapToDatabase(tenant: Partial<Tenant>): any {
    const dbTenant: any = {};
    
    if (tenant.name !== undefined) dbTenant.name = tenant.name;
    if (tenant.documentType !== undefined) dbTenant.document_type = tenant.documentType;
    if (tenant.document !== undefined) dbTenant.document = tenant.document;
    if (tenant.rg !== undefined) dbTenant.rg = tenant.rg;
    if (tenant.email !== undefined) dbTenant.email = tenant.email;
    if (tenant.phone !== undefined) dbTenant.phone = tenant.phone;
    if (tenant.status !== undefined) dbTenant.status = tenant.status;
    if (tenant.cep !== undefined) dbTenant.cep = tenant.cep;
    if (tenant.address !== undefined) dbTenant.address = tenant.address;
    if (tenant.number !== undefined) dbTenant.number = tenant.number;
    if (tenant.complement !== undefined) dbTenant.complement = tenant.complement;
    if (tenant.city !== undefined) dbTenant.city = tenant.city;
    if (tenant.state !== undefined) dbTenant.state = tenant.state;
    if (tenant.description !== undefined) dbTenant.description = tenant.description;
    
    // Handle cpf for backward compatibility
    if (tenant.documentType === "cpf" && tenant.document) {
      dbTenant.cpf = tenant.document;
    }
    
    return dbTenant;
  }
};