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
      // Usamos limit(1).maybeSingle() para evitar erro 406 se houver mais de 1 linha
      const { data, error } = await supabase
        .from("configs")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching config:", error);
        return this.getDefaultConfig();
      }

      if (!data) {
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
        locations: (data.locations as any[])?.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          cep: loc.cep,
          address: loc.address,
          city: loc.city,
          state: loc.state,
        })) || [],
      };
    } catch (error) {
      console.error("Error in getConfig:", error);
      return this.getDefaultConfig();
    }
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

    // Check if config exists using maybeSingle to avoid 406
    const { data } = await supabase
      .from("configs")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!data) {
      // Insert new
      const { error } = await supabase.from("configs").insert([dbData]);
      if (error) throw error;
    } else {
      // Update existing by ID
      const { error } = await supabase
        .from("configs")
        .update(dbData)
        .eq("id", data.id);
      
      if (error) throw error;
    }
  },

  async createLocation(location: Location) {
    const config = await this.getConfig();
    // Ensure locations is initialized
    const currentLocations = config.locations || [];
    const newLocations = [...currentLocations, location];
    await this.updateConfig({ locations: newLocations });
  },

  async updateLocation(location: Location) {
    const config = await this.getConfig();
    if (config && config.locations) {
      const newLocations = config.locations.map((l) =>
        l.id === location.id ? location : l
      );
      await this.updateConfig({ locations: newLocations });
    }
  },

  async deleteLocation(id: string) {
    const config = await this.getConfig();
    if (config && config.locations) {
      const newLocations = config.locations.filter((l) => l.id !== id);
      await this.updateConfig({ locations: newLocations });
    }
  },

  // Alias for backward compatibility
  async get() {
    return this.getConfig();
  },
};