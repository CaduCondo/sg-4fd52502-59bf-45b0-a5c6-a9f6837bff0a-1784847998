import { supabase } from "@/integrations/supabase/client";
import type { CompanyConfig, Location } from "@/types";

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
      locations: [],
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

      // Validar e normalizar locations
      let locations: Location[] = [];
      
      if (data.locations) {
        try {
          // Se locations é string, parsear
          if (typeof data.locations === "string") {
            locations = JSON.parse(data.locations);
          } 
          // Se já é array, usar direto
          else if (Array.isArray(data.locations)) {
            locations = data.locations;
          }
          
          // Validar estrutura de cada location
          locations = locations.filter((loc: any) => {
            if (!loc.id || !loc.name) {
              console.warn("⚠️ Local inválido encontrado e removido:", loc);
              return false;
            }
            return true;
          }).map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            cep: loc.cep || "",
            address: loc.address || "",
            number: loc.number || "",
            neighborhood: loc.neighborhood || "",
            city: loc.city || "",
            state: loc.state || "",
          }));

          console.log(`✅ ${locations.length} local(is) carregado(s) com sucesso`);
        } catch (parseError) {
          console.error("❌ Erro ao parsear locations:", parseError);
          locations = [];
        }
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
        locations: locations,
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

      console.log(`📝 Atualizando configuração com ${merged.locations?.length || 0} locais`);

      // Validar locations antes de salvar
      if (merged.locations) {
        const validLocations = merged.locations.filter(loc => {
          if (!loc.id || !loc.name) {
            console.warn("⚠️ Tentativa de salvar local inválido bloqueada:", loc);
            return false;
          }
          return true;
        });

        if (validLocations.length !== merged.locations.length) {
          console.warn(`⚠️ ${merged.locations.length - validLocations.length} local(is) inválido(s) removido(s)`);
          merged.locations = validLocations;
        }
      }

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
        locations: merged.locations || [], // Garantir array vazio se undefined
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

      // Verificar se os dados foram salvos corretamente
      const verifyConfig = await this.getConfig();
      console.log(`✅ Verificação: ${verifyConfig.locations?.length || 0} locais salvos`);
      
    } catch (error) {
      console.error("❌ ERRO CRÍTICO em updateConfig:", error);
      throw error;
    }
  },

  async createLocation(location: Location) {
    console.log(`➕ Criando novo local: ${location.name}`);
    
    // Validar location antes de criar
    if (!location.id || !location.name) {
      throw new Error("Local inválido: ID e nome são obrigatórios");
    }

    const config = await this.getConfig();
    const currentLocations = config.locations || [];
    
    // Verificar duplicatas
    const duplicate = currentLocations.find(l => l.id === location.id);
    if (duplicate) {
      console.warn(`⚠️ Local com ID ${location.id} já existe, substituindo`);
    }
    
    const newLocations = [...currentLocations.filter(l => l.id !== location.id), location];
    console.log(`📊 Total de locais após adicionar: ${newLocations.length}`);
    
    await this.updateConfig({ locations: newLocations });
  },

  async updateLocation(location: Location) {
    console.log(`🔄 Atualizando local: ${location.name} (ID: ${location.id})`);
    
    // Validar location antes de atualizar
    if (!location.id || !location.name) {
      throw new Error("Local inválido: ID e nome são obrigatórios");
    }

    const config = await this.getConfig();
    if (config && config.locations) {
      const locationIndex = config.locations.findIndex(l => l.id === location.id);
      
      if (locationIndex === -1) {
        console.warn(`⚠️ Local ${location.id} não encontrado, criando novo`);
        await this.createLocation(location);
        return;
      }

      const newLocations = config.locations.map((l) =>
        l.id === location.id ? location : l
      );
      
      console.log(`📊 Total de locais após atualizar: ${newLocations.length}`);
      await this.updateConfig({ locations: newLocations });
    }
  },

  async deleteLocation(id: string) {
    console.log(`🗑️ Deletando local: ${id}`);
    
    const config = await this.getConfig();
    if (config && config.locations) {
      const locationToDelete = config.locations.find(l => l.id === id);
      if (locationToDelete) {
        console.log(`🗑️ Removendo local: ${locationToDelete.name}`);
      }

      const newLocations = config.locations.filter((l) => l.id !== id);
      console.log(`📊 Total de locais após deletar: ${newLocations.length} (era ${config.locations.length})`);
      
      await this.updateConfig({ locations: newLocations });
    }
  },

  // Alias for backward compatibility
  async get() {
    return this.getConfig();
  },
};