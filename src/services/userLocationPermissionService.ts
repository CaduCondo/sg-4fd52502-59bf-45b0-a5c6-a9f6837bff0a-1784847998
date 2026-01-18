import { supabase } from "@/integrations/supabase/client";

export interface UserLocationPermission {
  id: string;
  user_id: string;
  location_id: string;
  created_at?: string;
}

export const userLocationPermissionService = {
  /**
   * Buscar todos os locais permitidos para um usuário
   */
  async getByUserId(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_location_permissions")
      .select("location_id")
      .eq("user_id", userId);

    if (error) throw error;
    return data?.map((p) => p.location_id) || [];
  },

  /**
   * Adicionar permissão de local para um usuário
   */
  async addPermission(userId: string, locationId: string): Promise<void> {
    const { error } = await supabase
      .from("user_location_permissions")
      .insert({ user_id: userId, location_id: locationId });

    if (error) throw error;
  },

  /**
   * Remover permissão de local para um usuário
   */
  async removePermission(userId: string, locationId: string): Promise<void> {
    const { error } = await supabase
      .from("user_location_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("location_id", locationId);

    if (error) throw error;
  },

  /**
   * Substituir todas as permissões de um usuário
   */
  async setPermissions(userId: string, locationIds: string[]): Promise<void> {
    // Remover todas as permissões existentes
    await supabase
      .from("user_location_permissions")
      .delete()
      .eq("user_id", userId);

    // Adicionar novas permissões
    if (locationIds.length > 0) {
      const permissions = locationIds.map((locationId) => ({
        user_id: userId,
        location_id: locationId,
      }));

      const { error } = await supabase
        .from("user_location_permissions")
        .insert(permissions);

      if (error) throw error;
    }
  },

  /**
   * Verificar se um usuário tem acesso a um local específico
   */
  async hasAccess(userId: string, locationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("user_location_permissions")
      .select("id")
      .eq("user_id", userId)
      .eq("location_id", locationId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  },
};