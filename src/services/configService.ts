import { supabase } from "@/integrations/supabase/client";
import type { Config } from "@/types";

const DEFAULT_CONFIG: Config = {
  adminFeePercentage: 6,
  locations: [
    "Jd. Colombo",
    "Signore",
    "Lemos",
    "Marrom",
    "Cinza",
    "Dora",
    "Acacias",
    "Outros"
  ]
};

export const configService = {
  async get(): Promise<Config> {
    try {
      const { data, error } = await supabase
        .from("configs")
        .select("*")
        .limit(1);
      
      if (error) throw error;
      
      // If no config exists, create default
      if (!data || data.length === 0) {
        return await this.save(DEFAULT_CONFIG);
      }
      
      // Return first config
      const config = data[0];
      const locations = Array.isArray(config.locations) 
        ? config.locations.map((l: any) => String(l)) 
        : [];

      return {
        adminFeePercentage: Number(config.admin_fee_percentage) || 6,
        locations: locations.length > 0 ? locations : DEFAULT_CONFIG.locations
      };
    } catch (error) {
      console.error("Error loading config:", error);
      // Return default config if error
      return DEFAULT_CONFIG;
    }
  },

  async save(config: Config): Promise<Config> {
    try {
      // Check if config exists
      const { data: existing } = await supabase
        .from("configs")
        .select("*")
        .limit(1);
      
      const configData = {
        admin_fee_percentage: config.adminFeePercentage,
        locations: config.locations,
        updated_at: new Date().toISOString()
      };

      if (existing && existing.length > 0) {
        // Update existing config
        const { data, error } = await supabase
          .from("configs")
          .update(configData)
          .eq("admin_fee_percentage", existing[0].admin_fee_percentage)
          .select()
          .single();
        
        if (error) throw error;
        
        const locations = Array.isArray(data.locations) 
          ? data.locations.map((l: any) => String(l)) 
          : [];

        return {
          adminFeePercentage: Number(data.admin_fee_percentage),
          locations
        };
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from("configs")
          .insert([configData])
          .select()
          .single();
        
        if (error) throw error;
        
        const locations = Array.isArray(data.locations) 
          ? data.locations.map((l: any) => String(l)) 
          : [];

        return {
          adminFeePercentage: Number(data.admin_fee_percentage),
          locations
        };
      }
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  },

  async addLocation(location: string): Promise<void> {
    try {
      const config = await this.get();
      
      // Check if location already exists
      if (config.locations.includes(location)) {
        throw new Error("Local já existe");
      }
      
      // Add new location
      const updatedConfig = {
        ...config,
        locations: [...config.locations, location].sort()
      };
      
      await this.save(updatedConfig);
    } catch (error) {
      console.error("Error adding location:", error);
      throw error;
    }
  },

  async removeLocation(location: string): Promise<void> {
    try {
      const config = await this.get();
      
      // Remove location
      const updatedConfig = {
        ...config,
        locations: config.locations.filter(loc => loc !== location)
      };
      
      await this.save(updatedConfig);
    } catch (error) {
      console.error("Error removing location:", error);
      throw error;
    }
  }
};