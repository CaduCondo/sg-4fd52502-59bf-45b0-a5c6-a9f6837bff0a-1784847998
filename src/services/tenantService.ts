import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/types";

export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("name");

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      cpf: item.cpf,
      document: item.document,
      documentType: item.document_type,
      birthDate: item.birth_date,
      zipCode: item.zip_code,
      address: item.address,
      number: item.number,
      complement: item.complement,
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      profession: item.profession,
      income: item.income,
      notes: item.notes,
      status: item.status,
      createdAt: item.created_at,
    })) as Tenant[];
  },

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const item: any = data;

    return {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      cpf: item.cpf,
      document: item.document,
      documentType: item.document_type,
      birthDate: item.birth_date,
      zipCode: item.zip_code,
      address: item.address,
      number: item.number,
      complement: item.complement,
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      profession: item.profession,
      income: item.income,
      notes: item.notes,
      status: item.status,
      createdAt: item.created_at,
    } as Tenant;
  },

  async create(tenant: Omit<Tenant, "id" | "createdAt">): Promise<Tenant> {
    const { data, error } = await supabase
      .from("tenants")
      .insert([{
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        cpf: tenant.cpf,
        document: tenant.document,
        document_type: tenant.documentType,
        birth_date: tenant.birthDate,
        zip_code: tenant.zipCode,
        address: tenant.address,
        number: tenant.number,
        complement: tenant.complement,
        neighborhood: tenant.neighborhood,
        city: tenant.city,
        state: tenant.state,
        profession: tenant.profession,
        income: tenant.income,
        notes: tenant.notes,
        status: tenant.status
      }])
      .select()
      .single();

    if (error) throw error;

    const item: any = data;
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      cpf: item.cpf,
      document: item.document,
      documentType: item.document_type,
      birthDate: item.birth_date,
      zipCode: item.zip_code,
      address: item.address,
      number: item.number,
      complement: item.complement,
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      profession: item.profession,
      income: item.income,
      notes: item.notes,
      status: item.status,
      createdAt: item.created_at,
    } as Tenant;
  },

  async update(tenant: Partial<Tenant>): Promise<Tenant> {
    const updateData: any = {};
    if (tenant.name) updateData.name = tenant.name;
    if (tenant.email) updateData.email = tenant.email;
    if (tenant.phone) updateData.phone = tenant.phone;
    if (tenant.cpf) updateData.cpf = tenant.cpf;
    if (tenant.document) updateData.document = tenant.document;
    if (tenant.documentType) updateData.document_type = tenant.documentType;
    if (tenant.birthDate) updateData.birth_date = tenant.birthDate;
    if (tenant.zipCode) updateData.zip_code = tenant.zipCode;
    if (tenant.address) updateData.address = tenant.address;
    if (tenant.number) updateData.number = tenant.number;
    if (tenant.complement) updateData.complement = tenant.complement;
    if (tenant.neighborhood) updateData.neighborhood = tenant.neighborhood;
    if (tenant.city) updateData.city = tenant.city;
    if (tenant.state) updateData.state = tenant.state;
    if (tenant.profession) updateData.profession = tenant.profession;
    if (tenant.income) updateData.income = tenant.income;
    if (tenant.notes) updateData.notes = tenant.notes;
    if (tenant.status) updateData.status = tenant.status;

    const { data, error } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    const item: any = data;
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      cpf: item.cpf,
      document: item.document,
      documentType: item.document_type,
      birthDate: item.birth_date,
      zipCode: item.zip_code,
      address: item.address,
      number: item.number,
      complement: item.complement,
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      profession: item.profession,
      income: item.income,
      notes: item.notes,
      status: item.status,
      createdAt: item.created_at,
    } as Tenant;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};