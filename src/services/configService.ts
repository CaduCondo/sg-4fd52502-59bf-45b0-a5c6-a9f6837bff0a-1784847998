import { supabase } from "@/integrations/supabase/client";
import type { CompanyConfig, Location, Config } from "@/types";

const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  companyName: "",
  cnpj: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  adminFee: 6,
  lateFeePercent: 2,
  interestRate: 1
};

export const configService = {
  // === MÉTODOS PARA DADOS DA EMPRESA ===

  async getConfig(): Promise<CompanyConfig> {
    try {
      const { data, error } = await supabase
        .from("configs")
        .select("*")
        .limit(1)
        .single();
      
      if (error) {
        // Se não existir, retorna padrão
        if (error.code === 'PGRST116') return DEFAULT_COMPANY_CONFIG;
        throw error;
      }
      
      return {
        companyName: data.company_name || "",
        cnpj: data.cnpj || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zip_code || "",
        adminFee: Number(data.admin_fee_percentage) || 6,
        lateFeePercent: Number(data.late_fee_percentage) || 2,
        interestRate: Number(data.interest_rate_percentage) || 1
      };
    } catch (error) {
      console.error("Error loading company config:", error);
      return DEFAULT_COMPANY_CONFIG;
    }
  },

  async updateConfig(config: CompanyConfig): Promise<CompanyConfig> {
    try {
      // Verificar se existe config
      const { data: existing } = await supabase
        .from("configs")
        .select("id")
        .limit(1);

      const payload = {
        company_name: config.companyName,
        cnpj: config.cnpj,
        email: config.email,
        phone: config.phone,
        address: config.address,
        city: config.city,
        state: config.state,
        zip_code: config.zipCode,
        admin_fee_percentage: config.adminFee,
        late_fee_percentage: config.lateFeePercent,
        interest_rate_percentage: config.interestRate,
        updated_at: new Date().toISOString()
      };

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from("configs")
          .update(payload)
          .eq("id", existing[0].id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configs")
          .insert([payload]);
        
        if (error) throw error;
      }

      return config;
    } catch (error) {
      console.error("Error updating company config:", error);
      throw error;
    }
  },

  // === MÉTODOS COMPATIBILIDADE LEGADO (usado em outros lugares) ===
  
  async get(): Promise<Config> {
    const config = await this.getConfig();
    const locations = await this.getLocations();
    return {
      adminFeePercentage: config.adminFee,
      lateFeePercentage: config.lateFeePercent,
      interestRatePercentage: config.interestRate,
      locations: locations
    };
  },

  // === MÉTODOS PARA LOCAIS ===

  async getLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from("configs")
        .select("locations")
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data || !data.locations) return [];
      
      const locations = data.locations as any[];
      return locations.map(l => {
         if (typeof l === 'string') {
            return {
              id: crypto.randomUUID(),
              name: l,
              cep: "",
              address: "",
              number: "",
              neighborhood: "",
              city: "",
              state: "",
              createdAt: new Date().toISOString()
            };
          }
          return l as Location;
      });
    } catch (error) {
      console.error("Error loading locations:", error);
      return [];
    }
  },

  async createLocation(locationData: Omit<Location, "id" | "createdAt">): Promise<Location> {
    try {
      const newLocation: Location = {
        ...locationData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };

      const locations = await this.getLocations();
      locations.push(newLocation);
      
      // Salvar no banco
      await this.saveLocations(locations);
      
      return newLocation;
    } catch (error) {
      console.error("Error creating location:", error);
      throw error;
    }
  },

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    try {
      const locations = await this.getLocations();
      const index = locations.findIndex(l => l.id === id);
      
      if (index === -1) throw new Error("Location not found");
      
      locations[index] = { ...locations[index], ...updates };
      
      await this.saveLocations(locations);
      
      return locations[index];
    } catch (error) {
      console.error("Error updating location:", error);
      throw error;
    }
  },

  async deleteLocation(id: string): Promise<void> {
    try {
      const locations = await this.getLocations();
      const filtered = locations.filter(l => l.id !== id);
      await this.saveLocations(filtered);
    } catch (error) {
      console.error("Error deleting location:", error);
      throw error;
    }
  },

  // Helper privado
  async saveLocations(locations: Location[]): Promise<void> {
     const { data: existing } = await supabase
        .from("configs")
        .select("id")
        .limit(1);
        
     const locationsJson = locations.map(l => ({
        id: l.id,
        name: l.name,
        cep: l.cep,
        address: l.address,
        number: l.number,
        neighborhood: l.neighborhood,
        city: l.city,
        state: l.state,
        createdAt: l.createdAt
      }));

     if (existing && existing.length > 0) {
        await supabase
          .from("configs")
          .update({ locations: locationsJson })
          .eq("id", existing[0].id);
     } else {
        await supabase
          .from("configs")
          .insert([{ locations: locationsJson }]);
     }
  }
};