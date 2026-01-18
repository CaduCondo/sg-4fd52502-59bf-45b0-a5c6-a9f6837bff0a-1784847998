import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LocationPermission = Database["public"]["Tables"]["user_location_permissions"]["Row"];
type LocationPermissionInsert = Database["public"]["Tables"]["user_location_permissions"]["Insert"];
type LocationPermissionUpdate = Database["public"]["Tables"]["user_location_permissions"]["Update"];

interface LocationWithPermissions {
  location_id: string;
  location_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UserWithPermissions {
  user_id: string;
  user_name: string;
  user_role: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const locationPermissionService = {
  /**
   * Buscar permissões de um usuário para todos os locais
   */
  async getUserPermissions(userId: string): Promise<LocationPermission[]> {
    console.log(`🔐 Buscando permissões do usuário: ${userId}...`);
    
    const { data, error } = await supabase
      .from("user_location_permissions")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Erro ao buscar permissões:", error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} permissão(ões) encontrada(s)`);
    return data || [];
  },

  /**
   * Buscar permissões de um usuário para um local específico
   */
  async getUserLocationPermission(
    userId: string,
    locationId: string
  ): Promise<LocationPermission | null> {
    console.log(`🔐 Verificando permissão: usuário ${userId} → local ${locationId}...`);
    
    const { data, error } = await supabase
      .from("user_location_permissions")
      .select("*")
      .eq("user_id", userId)
      .eq("location_id", locationId)
      .maybeSingle();

    if (error) {
      console.error("❌ Erro ao verificar permissão:", error);
      throw error;
    }

    if (data) {
      console.log(`✅ Permissão encontrada: view=${data.can_view}, edit=${data.can_edit}, delete=${data.can_delete}`);
    } else {
      console.log("ℹ️ Nenhuma permissão específica encontrada");
    }

    return data;
  },

  /**
   * Buscar todos os usuários com permissão em um local
   */
  async getLocationUsers(locationId: string): Promise<UserWithPermissions[]> {
    console.log(`👥 Buscando usuários com acesso ao local: ${locationId}...`);
    
    const { data, error } = await supabase
      .from("user_location_permissions")
      .select(`
        user_id,
        can_view,
        can_edit,
        can_delete,
        system_users!user_location_permissions_user_id_fkey (
          name,
          role
        )
      `)
      .eq("location_id", locationId);

    if (error) {
      console.error("❌ Erro ao buscar usuários do local:", error);
      throw error;
    }

    const users: UserWithPermissions[] = (data || []).map((item: any) => ({
      user_id: item.user_id,
      user_name: item.system_users?.name || "Usuário Desconhecido",
      user_role: item.system_users?.role || "unknown",
      can_view: item.can_view,
      can_edit: item.can_edit,
      can_delete: item.can_delete,
    }));

    console.log(`✅ ${users.length} usuário(s) com acesso ao local`);
    return users;
  },

  /**
   * Buscar locais que um usuário tem acesso
   */
  async getUserLocations(userId: string): Promise<LocationWithPermissions[]> {
    console.log(`📍 Buscando locais acessíveis ao usuário: ${userId}...`);
    
    const { data, error } = await supabase
      .from("user_location_permissions")
      .select(`
        location_id,
        can_view,
        can_edit,
        can_delete,
        locations!user_location_permissions_location_id_fkey (
          name
        )
      `)
      .eq("user_id", userId)
      .eq("can_view", true);

    if (error) {
      console.error("❌ Erro ao buscar locais do usuário:", error);
      throw error;
    }

    const locations: LocationWithPermissions[] = (data || []).map((item: any) => ({
      location_id: item.location_id,
      location_name: item.locations?.name || "Local Desconhecido",
      can_view: item.can_view,
      can_edit: item.can_edit,
      can_delete: item.can_delete,
    }));

    console.log(`✅ ${locations.length} local(is) acessível(is)`);
    return locations;
  },

  /**
   * Criar ou atualizar permissão
   */
  async upsertPermission(permission: LocationPermissionInsert): Promise<LocationPermission> {
    console.log(`💾 Salvando permissão: usuário ${permission.user_id} → local ${permission.location_id}...`);
    
    const { data, error } = await supabase
      .from("user_location_permissions")
      .upsert([permission], {
        onConflict: "user_id,location_id",
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao salvar permissão:", error);
      throw error;
    }

    console.log(`✅ Permissão salva: view=${data.can_view}, edit=${data.can_edit}, delete=${data.can_delete}`);
    return data;
  },

  /**
   * Atualizar permissão existente
   */
  async updatePermission(
    userId: string,
    locationId: string,
    updates: LocationPermissionUpdate
  ): Promise<LocationPermission> {
    console.log(`📝 Atualizando permissão: usuário ${userId} → local ${locationId}...`);
    
    const { data, error } = await supabase
      .from("user_location_permissions")
      .update(updates)
      .eq("user_id", userId)
      .eq("location_id", locationId)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar permissão:", error);
      throw error;
    }

    console.log(`✅ Permissão atualizada`);
    return data;
  },

  /**
   * Remover permissão
   */
  async deletePermission(userId: string, locationId: string): Promise<void> {
    console.log(`🗑️ Removendo permissão: usuário ${userId} → local ${locationId}...`);
    
    const { error } = await supabase
      .from("user_location_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("location_id", locationId);

    if (error) {
      console.error("❌ Erro ao remover permissão:", error);
      throw error;
    }

    console.log(`✅ Permissão removida`);
  },

  /**
   * Verificar se usuário pode visualizar local
   */
  async canView(userId: string, locationId: string): Promise<boolean> {
    const permission = await this.getUserLocationPermission(userId, locationId);
    return permission?.can_view || false;
  },

  /**
   * Verificar se usuário pode editar local
   */
  async canEdit(userId: string, locationId: string): Promise<boolean> {
    const permission = await this.getUserLocationPermission(userId, locationId);
    return permission?.can_edit || false;
  },

  /**
   * Verificar se usuário pode deletar local
   */
  async canDelete(userId: string, locationId: string): Promise<boolean> {
    const permission = await this.getUserLocationPermission(userId, locationId);
    return permission?.can_delete || false;
  },

  /**
   * Conceder acesso total a um usuário em um local
   */
  async grantFullAccess(userId: string, locationId: string): Promise<LocationPermission> {
    console.log(`🔓 Concedendo acesso total: usuário ${userId} → local ${locationId}...`);
    
    return this.upsertPermission({
      user_id: userId,
      location_id: locationId,
      can_view: true,
      can_edit: true,
      can_delete: true,
    });
  },

  /**
   * Conceder acesso apenas leitura
   */
  async grantReadOnlyAccess(userId: string, locationId: string): Promise<LocationPermission> {
    console.log(`👁️ Concedendo acesso somente leitura: usuário ${userId} → local ${locationId}...`);
    
    return this.upsertPermission({
      user_id: userId,
      location_id: locationId,
      can_view: true,
      can_edit: false,
      can_delete: false,
    });
  },

  /**
   * Revogar todo acesso
   */
  async revokeAccess(userId: string, locationId: string): Promise<void> {
    console.log(`🔒 Revogando acesso: usuário ${userId} → local ${locationId}...`);
    await this.deletePermission(userId, locationId);
  },

  /**
   * Copiar permissões de um local para outro
   */
  async copyPermissions(fromLocationId: string, toLocationId: string): Promise<void> {
    console.log(`📋 Copiando permissões: de ${fromLocationId} → para ${toLocationId}...`);
    
    const { data: permissions, error } = await supabase
      .from("user_location_permissions")
      .select("user_id, can_view, can_edit, can_delete")
      .eq("location_id", fromLocationId);

    if (error) {
      console.error("❌ Erro ao buscar permissões para copiar:", error);
      throw error;
    }

    if (!permissions || permissions.length === 0) {
      console.log("ℹ️ Nenhuma permissão para copiar");
      return;
    }

    const newPermissions = permissions.map(p => ({
      ...p,
      location_id: toLocationId,
    }));

    const { error: insertError } = await supabase
      .from("user_location_permissions")
      .upsert(newPermissions);

    if (insertError) {
      console.error("❌ Erro ao copiar permissões:", insertError);
      throw insertError;
    }

    console.log(`✅ ${permissions.length} permissão(ões) copiada(s)`);
  },
};