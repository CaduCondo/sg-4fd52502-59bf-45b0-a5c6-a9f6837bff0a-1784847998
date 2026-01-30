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
    phone: "(11) 97654-3210",
    whatsapp: "5511976543210",
    email: "carlos.uva@terra.com.br",
    address: "São Paulo, SP",
  },
  whatsappMessage: "Olá! Gostaria de mais informações sobre os imóveis disponíveis.",
};

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

  return data;
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
    .eq("id", config.id); // Assuming we update by ID, or just take the first one if singleton
  
  if (error) throw error;
};