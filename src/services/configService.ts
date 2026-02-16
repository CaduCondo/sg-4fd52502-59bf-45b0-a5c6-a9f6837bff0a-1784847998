import { supabase } from "@/integrations/supabase/client";
import { CompanyConfig } from "@/types";

export interface SiteConfig {
  name: string;
  description: string;
  logo: string;
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
  whatsappMessage: string;
}

// Configurações estáticas para a parte pública
export const siteConfig = {
  name: "D'Uvo Enterprise",
  description: "Encontre o imóvel perfeito para você",
  contact: {
    phone: "(11) 99680-3386",
    whatsapp: "5511996803386",
    email: "carlos.uva@terra.com.br",
    address: "São Paulo, SP",
  },
  whatsappMessage: "Olá! Gostaria de mais informações sobre os imóveis disponíveis.",
};

const mapConfigFromDb = (data: any): CompanyConfig => ({
  id: data.id,
  company_name: data.company_name,
  cnpj: data.cnpj,
  email: data.email,
  phone: data.phone,
  address: data.address,
  city: data.city,
  state: data.state,
  zip_code: data.zip_code,
  admin_fee_percentage: Number(data.admin_fee_percentage),
  broker_fee_percentage: Number(data.broker_fee_percentage),
  interest_rate_percentage: Number(data.interest_rate_percentage),
  late_fee_percentage: Number(data.late_fee_percentage),
  management_fee_percentage: Number(data.management_fee_percentage),
  logo_url: data.logo_url || null,
  primary_color: data.primary_color || null,
  secondary_color: data.secondary_color || null,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

// Funções para gerenciar configurações dinâmicas do sistema (banco de dados)
export async function getConfig(): Promise<CompanyConfig | null> {
  const { data, error } = await supabase
    .from("configs")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching config:", error);
    throw error;
  }

  if (!data) return null;

  return mapConfigFromDb(data);
}

export const updateConfig = async (config: CompanyConfig) => {
  const { error } = await supabase
    .from("configs")
    .update({
      company_name: config.company_name,
      cnpj: config.cnpj,
      email: config.email,
      phone: config.phone,
      address: config.address,
      city: config.city,
      state: config.state,
      zip_code: config.zip_code,
      admin_fee_percentage: config.admin_fee_percentage,
      management_fee_percentage: config.management_fee_percentage || 0,
      late_fee_percentage: config.late_fee_percentage,
      interest_rate_percentage: config.interest_rate_percentage,
    })
    .eq("id", config.id); 
  
  if (error) throw error;
};

export const createConfig = async (config: CompanyConfig) => {
  const { data, error } = await supabase
    .from("configs")
    .insert({
      company_name: config.company_name,
      cnpj: config.cnpj,
      email: config.email,
      phone: config.phone,
      address: config.address,
      city: config.city,
      state: config.state,
      zip_code: config.zip_code,
      admin_fee_percentage: config.admin_fee_percentage,
      management_fee_percentage: config.management_fee_percentage || 0,
      late_fee_percentage: config.late_fee_percentage,
      interest_rate_percentage: config.interest_rate_percentage,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (!data) throw new Error("Erro ao criar configuração");

  return mapConfigFromDb(data);
};