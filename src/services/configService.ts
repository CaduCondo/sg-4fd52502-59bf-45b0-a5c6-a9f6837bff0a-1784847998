import { supabase } from "@/integrations/supabase/client";
import type { Config } from "@/types";

export const configService = {
  async get(): Promise<Config> {
    const { data, error } = await supabase
      .from("configs")
      .select("*")
      .single();
    
    if (error) {
      // Return default if not found
      return { adminFeePercentage: 6, locations: [] };
    }
    
    // Safely cast the JSON locations to string[]
    const locations = Array.isArray(data.locations) 
      ? data.locations.map(String) 
      : [];

    return {
      adminFeePercentage: Number(data.admin_fee_percentage),
      locations: locations
    };
  },

  async save(config: Config): Promise<void> {
    const { error } = await supabase
      .from("configs")
      .upsert({
        admin_fee_percentage: config.adminFeePercentage,
        locations: config.locations,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
  },

  async addLocation(location: string): Promise<void> {
    const config = await this.get();
    if (!config.locations.includes(location)) {
      config.locations.push(location);
      config.locations.sort();
      await this.save(config);
    }
  },

  async removeLocation(location: string): Promise<void> {
    const config = await this.get();
    config.locations = config.locations.filter(l => l !== location);
    await this.save(config);
  }
};