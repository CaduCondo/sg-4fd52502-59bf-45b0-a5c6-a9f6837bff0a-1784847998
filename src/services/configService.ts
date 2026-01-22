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
export const getConfig = async (): Promise<CompanyConfig | null> => {
  try {
    const { data, error } = await supabase
      .from("configs")
      .select("*")
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching config:", error);
    throw error;
  }
};

export const updateConfig = async (config: CompanyConfig): Promise<CompanyConfig> => {
  try {
    // Check if config exists first
    const existing = await getConfig();

    let result;
    
    if (existing) {
      const { data, error } = await supabase
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
          late_fee_percentage: config.late_fee_percentage,
          interest_rate_percentage: config.interest_rate_percentage,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("configs")
        .insert([{
          company_name: config.company_name,
          cnpj: config.cnpj,
          email: config.email,
          phone: config.phone,
          address: config.address,
          city: config.city,
          state: config.state,
          zip_code: config.zip_code,
          admin_fee_percentage: config.admin_fee_percentage,
          late_fee_percentage: config.late_fee_percentage,
          interest_rate_percentage: config.interest_rate_percentage
        }])
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    console.error("Error updating config:", error);
    throw error;
  }
};