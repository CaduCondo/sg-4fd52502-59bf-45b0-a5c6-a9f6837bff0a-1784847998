import { supabase } from "@/integrations/supabase/client";
import type { CompanyConfig, Location } from "@/types";

export const configService = {
  async getConfig(): Promise<CompanyConfig | null> {
    const { data, error } = await supabase
      .from("configs")
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
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
      locations: (data.locations as any[])?.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        cep: loc.cep,
        address: loc.address,
        city: loc.city,
        state: loc.state,
      })) || [],
    };
  },

  async updateConfig(config: Partial<CompanyConfig>) {
    // First get existing config to merge
    const existing = await this.getConfig();
    const merged = { ...existing, ...config };

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
      locations: merged.locations, // Stored as JSONB
      updated_at: new Date().toISOString(),
    };

    // Check if config exists
    const { count } = await supabase
      .from("configs")
      .select("*", { count: "exact", head: true });

    if (count === 0) {
      // Insert new
      const { error } = await supabase.from("configs").insert([dbData]);
      if (error) throw error;
    } else {
      // Update existing (assuming single row for config)
      // Since we don't have an ID, we update the first row found or use a fixed logic
      // Ideally configs table should have a single row constraint or known ID
      // For now, let's update all rows (expecting only 1)
      const { error } = await supabase
        .from("configs")
        .update(dbData)
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows basically
      
      if (error) throw error;
    }
  },

  async createLocation(location: Location) {
    const config = await this.getConfig();
    if (!config) {
      // Create initial config with this location
      await this.updateConfig({ locations: [location] });
    } else {
      const newLocations = [...config.locations, location];
      await this.updateConfig({ locations: newLocations });
    }
  },

  async updateLocation(location: Location) {
    const config = await this.getConfig();
    if (config) {
      const newLocations = config.locations.map((l) =>
        l.id === location.id ? location : l
      );
      await this.updateConfig({ locations: newLocations });
    }
  },

  async deleteLocation(id: string) {
    const config = await this.getConfig();
    if (config) {
      const newLocations = config.locations.filter((l) => l.id !== id);
      await this.updateConfig({ locations: newLocations });
    }
  },

  // Alias for backward compatibility
  async get() {
    return this.getConfig();
  },
};