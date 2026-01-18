import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];
type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type LocationUpdate = Database["public"]["Tables"]["locations"]["Update"];

export const locationService = {
  /**
   * Buscar todos os locais ativos
   */
  async getAll(): Promise<Location[]> {
    console.log("📍 Buscando todos os locais ativos...");
    
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("state", { ascending: true })
      .order("city", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar locais:", error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} local(is) encontrado(s)`);
    return data || [];
  },

  /**
   * Buscar local por ID
   */
  async getById(id: string): Promise<Location | null> {
    console.log(`📍 Buscando local ID: ${id}...`);
    
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("❌ Erro ao buscar local:", error);
      throw error;
    }

    if (!data) {
      console.warn(`⚠️ Local não encontrado: ${id}`);
      return null;
    }

    console.log(`✅ Local encontrado: ${data.name}`);
    return data;
  },

  /**
   * Criar novo local
   */
  async create(location: LocationInsert): Promise<Location> {
    console.log(`➕ Criando novo local: ${location.name}...`);
    
    const { data, error } = await supabase
      .from("locations")
      .insert([location])
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao criar local:", error);
      throw error;
    }

    console.log(`✅ Local criado com sucesso: ${data.name} (ID: ${data.id})`);
    return data;
  },

  /**
   * Atualizar local existente
   */
  async update(id: string, updates: LocationUpdate): Promise<Location> {
    console.log(`📝 Atualizando local ID: ${id}...`);
    
    const { data, error } = await supabase
      .from("locations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar local:", error);
      throw error;
    }

    console.log(`✅ Local atualizado: ${data.name}`);
    return data;
  },

  /**
   * Soft delete - marca como inativo
   */
  async delete(id: string): Promise<void> {
    console.log(`🗑️ Desativando local ID: ${id}...`);
    
    // Buscar nome antes de deletar para log
    const location = await this.getById(id);
    
    const { error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("❌ Erro ao desativar local:", error);
      throw error;
    }

    console.log(`✅ Local desativado: ${location?.name || id}`);
  },

  /**
   * Hard delete - remove permanentemente (apenas admin)
   */
  async hardDelete(id: string): Promise<void> {
    console.log(`⚠️ DELETANDO PERMANENTEMENTE local ID: ${id}...`);
    
    const location = await this.getById(id);
    
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Erro ao deletar local permanentemente:", error);
      throw error;
    }

    console.log(`✅ Local deletado permanentemente: ${location?.name || id}`);
  },

  /**
   * Reativar local desativado
   */
  async reactivate(id: string): Promise<Location> {
    console.log(`♻️ Reativando local ID: ${id}...`);
    
    const { data, error } = await supabase
      .from("locations")
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao reativar local:", error);
      throw error;
    }

    console.log(`✅ Local reativado: ${data.name}`);
    return data;
  },

  /**
   * Buscar locais por cidade
   */
  async getByCity(city: string): Promise<Location[]> {
    console.log(`📍 Buscando locais na cidade: ${city}...`);
    
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("city", city)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("❌ Erro ao buscar locais por cidade:", error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} local(is) encontrado(s) em ${city}`);
    return data || [];
  },

  /**
   * Buscar locais por estado
   */
  async getByState(state: string): Promise<Location[]> {
    console.log(`📍 Buscando locais no estado: ${state}...`);
    
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("state", state)
      .eq("is_active", true)
      .order("city", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar locais por estado:", error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} local(is) encontrado(s) em ${state}`);
    return data || [];
  },

  /**
   * Buscar cidades únicas
   */
  async getCities(): Promise<string[]> {
    console.log("🏙️ Buscando lista de cidades...");
    
    const { data, error } = await supabase
      .from("locations")
      .select("city")
      .eq("is_active", true)
      .order("city");

    if (error) {
      console.error("❌ Erro ao buscar cidades:", error);
      throw error;
    }

    const cities = [...new Set(data?.map(l => l.city).filter(Boolean))];
    console.log(`✅ ${cities.length} cidade(s) encontrada(s)`);
    return cities;
  },

  /**
   * Buscar estados únicos
   */
  async getStates(): Promise<string[]> {
    console.log("🗺️ Buscando lista de estados...");
    
    const { data, error } = await supabase
      .from("locations")
      .select("state")
      .eq("is_active", true)
      .order("state");

    if (error) {
      console.error("❌ Erro ao buscar estados:", error);
      throw error;
    }

    const states = [...new Set(data?.map(l => l.state).filter(Boolean))];
    console.log(`✅ ${states.length} estado(s) encontrado(s)`);
    return states;
  },

  /**
   * Contar locais ativos
   */
  async count(): Promise<number> {
    const { count, error } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) {
      console.error("❌ Erro ao contar locais:", error);
      throw error;
    }

    return count || 0;
  },
};