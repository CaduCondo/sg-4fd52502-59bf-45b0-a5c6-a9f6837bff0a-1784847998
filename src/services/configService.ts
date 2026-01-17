import { supabase } from "@/integrations/supabase/client";
import type { Config, Location } from "@/types";

const DEFAULT_CONFIG: Config = {
  adminFeePercentage: 6,
  lateFeePercentage: 2,
  interestRatePercentage: 1,
  locations: []
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
      
      // Handle legacy locations (strings) vs new locations (objects)
      let locations: Location[] = [];
      if (Array.isArray(config.locations)) {
        locations = config.locations.map((l: any) => {
          if (typeof l === 'string') {
            // Convert legacy string location to object
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
      }

      return {
        adminFeePercentage: Number(config.admin_fee_percentage) || 6,
        lateFeePercentage: Number(config.late_fee_percentage) || 2,
        interestRatePercentage: Number(config.interest_rate_percentage) || 1,
        locations: locations
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
      
      // Prepare data for DB - converting Location objects to JSON-compatible array
      const locationsJson = config.locations.map(l => ({
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
      
      const configData = {
        admin_fee_percentage: config.adminFeePercentage,
        late_fee_percentage: config.lateFeePercentage,
        interest_rate_percentage: config.interestRatePercentage,
        locations: locationsJson, // Supabase will handle JSON conversion
        updated_at: new Date().toISOString()
      };

      if (existing && existing.length > 0) {
        // Update existing config
        const { data, error } = await supabase
          .from("configs")
          .update(configData)
          .eq("id", existing[0].id)
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          adminFeePercentage: Number(data.admin_fee_percentage),
          lateFeePercentage: Number(data.late_fee_percentage),
          interestRatePercentage: Number(data.interest_rate_percentage),
          locations: (data.locations as any[]).map(l => l as Location)
        };
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from("configs")
          .insert([configData])
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          adminFeePercentage: Number(data.admin_fee_percentage),
          lateFeePercentage: Number(data.late_fee_percentage),
          interestRatePercentage: Number(data.interest_rate_percentage),
          locations: (data.locations as any[]).map(l => l as Location)
        };
      }
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  },

  async addLocation(location: Location): Promise<Config> {
    try {
      const config = await this.get();
      // Check for duplicates by name or ID
      if (!config.locations.some(l => l.id === location.id || l.name === location.name)) {
        config.locations.push(location);
        // Sort by name
        config.locations.sort((a, b) => a.name.localeCompare(b.name));
        return await this.save(config);
      }
      return config;
    } catch (error) {
      console.error("Error adding location:", error);
      throw error;
    }
  },

  async removeLocation(locationId: string): Promise<Config> {
    try {
      const config = await this.get();
      config.locations = config.locations.filter((l) => l.id !== locationId);
      return await this.save(config);
    } catch (error) {
      console.error("Error removing location:", error);
      throw error;
    }
  }
};