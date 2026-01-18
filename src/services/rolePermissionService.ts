import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RolePermission = Database["public"]["Tables"]["role_permissions"]["Row"];
type RolePermissionInsert = Database["public"]["Tables"]["role_permissions"]["Insert"];
type RolePermissionUpdate = Database["public"]["Tables"]["role_permissions"]["Update"];

export type UserRole = "admin" | "broker" | "viewer";
export type Resource = 
  | "dashboard"
  | "settings"
  | "locations"
  | "properties"
  | "tenants"
  | "rentals"
  | "payments"
  | "financial"
  | "users";

export interface Permission {
  id: string;
  role: UserRole;
  resource: Resource;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export const rolePermissionService = {
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role", { ascending: true })
        .order("resource", { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar permissões:", error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} permissão(ões) carregada(s)`);
      return (data as Permission[]) || [];
    } catch (error) {
      console.error("❌ Erro ao buscar permissões:", error);
      throw error;
    }
  },

  async getPermissionsByRole(role: UserRole): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", role)
        .order("resource", { ascending: true });

      if (error) {
        console.error(`❌ Erro ao buscar permissões do perfil ${role}:`, error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} permissão(ões) do perfil ${role} carregada(s)`);
      return (data as Permission[]) || [];
    } catch (error) {
      console.error(`❌ Erro ao buscar permissões do perfil ${role}:`, error);
      throw error;
    }
  },

  async getPermission(role: UserRole, resource: Resource): Promise<Permission | null> {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", role)
        .eq("resource", resource)
        .maybeSingle();

      if (error) {
        console.error(`❌ Erro ao buscar permissão ${role}/${resource}:`, error);
        throw error;
      }

      return (data as Permission) || null;
    } catch (error) {
      console.error(`❌ Erro ao buscar permissão ${role}/${resource}:`, error);
      throw error;
    }
  },

  async updatePermission(
    role: UserRole,
    resource: Resource,
    permissions: {
      can_view?: boolean;
      can_create?: boolean;
      can_edit?: boolean;
      can_delete?: boolean;
    }
  ): Promise<Permission> {
    try {
      const updates: RolePermissionUpdate = {
        ...permissions,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("role_permissions")
        .update(updates)
        .eq("role", role)
        .eq("resource", resource)
        .select()
        .single();

      if (error) {
        console.error(`❌ Erro ao atualizar permissão ${role}/${resource}:`, error);
        throw error;
      }

      console.log(`✅ Permissão ${role}/${resource} atualizada com sucesso`);
      return data as Permission;
    } catch (error) {
      console.error(`❌ Erro ao atualizar permissão ${role}/${resource}:`, error);
      throw error;
    }
  },

  async createPermission(permission: Omit<RolePermissionInsert, "id" | "created_at" | "updated_at">): Promise<Permission> {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .insert([permission])
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao criar permissão:", error);
        throw error;
      }

      console.log(`✅ Permissão ${permission.role}/${permission.resource} criada com sucesso`);
      return data as Permission;
    } catch (error) {
      console.error("❌ Erro ao criar permissão:", error);
      throw error;
    }
  },

  async hasPermission(
    userId: string,
    resource: Resource,
    action: "view" | "create" | "edit" | "delete"
  ): Promise<boolean> {
    try {
      const { data: user, error: userError } = await supabase
        .from("system_users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("❌ Usuário não encontrado:", userError);
        return false;
      }

      const { data: permission, error: permError } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", user.role)
        .eq("resource", resource)
        .maybeSingle();

      if (permError || !permission) {
        console.log(`⚠️ Permissão não encontrada para ${user.role}/${resource}`);
        return false;
      }

      const actionMap = {
        view: permission.can_view,
        create: permission.can_create,
        edit: permission.can_edit,
        delete: permission.can_delete,
      };

      return actionMap[action] || false;
    } catch (error) {
      console.error("❌ Erro ao verificar permissão:", error);
      return false;
    }
  },

  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const { data: user, error: userError } = await supabase
        .from("system_users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("❌ Usuário não encontrado:", userError);
        return [];
      }

      return this.getPermissionsByRole(user.role as UserRole);
    } catch (error) {
      console.error("❌ Erro ao buscar permissões do usuário:", error);
      return [];
    }
  },

  async bulkUpdatePermissions(
    updates: Array<{
      role: UserRole;
      resource: Resource;
      permissions: {
        can_view?: boolean;
        can_create?: boolean;
        can_edit?: boolean;
        can_delete?: boolean;
      };
    }>
  ): Promise<void> {
    try {
      console.log(`🔄 Atualizando ${updates.length} permissão(ões) em lote...`);

      for (const update of updates) {
        await this.updatePermission(update.role, update.resource, update.permissions);
      }

      console.log(`✅ ${updates.length} permissão(ões) atualizada(s) com sucesso`);
    } catch (error) {
      console.error("❌ Erro ao atualizar permissões em lote:", error);
      throw error;
    }
  },
};