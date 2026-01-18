import { supabase } from "@/integrations/supabase/client";
import type { CompanyConfig } from "@/types";

export const configService = {
  getDefaultConfig(): CompanyConfig {
    return {
      companyName: "Minha Imobiliária",
      cnpj: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      adminFeePercentage: 10,
      lateFeePercentage: 2,
      interestRatePercentage: 1,
    };
  },

  async getConfig(): Promise<CompanyConfig> {
    try {
      // Buscar TODAS as configs para identificar duplicatas
      const { data: allConfigs, error: allError } = await supabase
        .from("configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (allError) {
        console.error("Error fetching all configs:", allError);
      }

      // Log para debug
      if (allConfigs && allConfigs.length > 1) {
        console.warn(`⚠️ MÚLTIPLAS CONFIGURAÇÕES ENCONTRADAS (${allConfigs.length})!`);
        console.warn("Usando a mais recente. Considere limpar registros duplicados.");
      }

      // Buscar a configuração mais recente
      const { data, error } = await supabase
        .from("configs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching config:", error);
        return this.getDefaultConfig();
      }

      if (!data) {
        console.log("📋 Nenhuma configuração encontrada, usando padrão");
        return this.getDefaultConfig();
      }

      // Map database fields to frontend interface
      return {
        companyName: data.company_name || "",
        cnpj: data.cnpj || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zip_code || "",
        adminFeePercentage: data.admin_fee_percentage || 0,
        lateFeePercentage: data.late_fee_percentage || 0,
        interestRatePercentage: data.interest_rate_percentage || 0,
      };
    } catch (error) {
      console.error("❌ Error in getConfig:", error);
      return this.getDefaultConfig();
    }
  },

  async updateConfig(config: Partial<CompanyConfig>) {
    try {
      // First get existing config to merge
      const existing = await this.getConfig();
      const merged = { ...existing, ...config };

      console.log(`📝 Atualizando configuração...`);

      // Map frontend interface to database fields
      const dbData = {
        company_name: merged.companyName,
        cnpj: merged.cnpj,
        email: merged.email,
        phone: merged.phone,
        address: merged.address,
        city: merged.city,
        state: merged.state,
        zip_code: merged.zipCode,
        admin_fee_percentage: merged.adminFeePercentage,
        late_fee_percentage: merged.lateFeePercentage,
        interest_rate_percentage: merged.interestRatePercentage,
        updated_at: new Date().toISOString(),
      };

      // Check if config exists
      const { data: existingConfig, error: selectError } = await supabase
        .from("configs")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        console.error("❌ Erro ao buscar config existente:", selectError);
        throw selectError;
      }

      if (!existingConfig) {
        // Insert new
        console.log("➕ Criando nova configuração");
        const { error } = await supabase.from("configs").insert([dbData]);
        if (error) {
          console.error("❌ Erro ao criar configuração:", error);
          throw error;
        }
        console.log("✅ Configuração criada com sucesso");
      } else {
        // Update existing by ID
        console.log(`🔄 Atualizando configuração existente (ID: ${existingConfig.id})`);
        const { error } = await supabase
          .from("configs")
          .update(dbData)
          .eq("id", existingConfig.id);
        
        if (error) {
          console.error("❌ Erro ao atualizar configuração:", error);
          throw error;
        }
        console.log("✅ Configuração atualizada com sucesso");
      }
      
    } catch (error) {
      console.error("❌ ERRO CRÍTICO em updateConfig:", error);
      throw error;
    }
  },

  // Alias for backward compatibility
  async get() {
    return this.getConfig();
  },
};