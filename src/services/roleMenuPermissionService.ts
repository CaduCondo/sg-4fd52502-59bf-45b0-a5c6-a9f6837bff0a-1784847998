import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "broker" | "financial";
export type MenuItem = "dashboard" | "properties" | "tenants" | "rentals" | "payments" | "financial" | "settings";

export interface RoleMenuPermission {
  id: string;
  role: UserRole;
  menu_item: MenuItem;
  can_access: boolean;
  created_at: string;
  updated_at: string;
}

export const roleMenuPermissionService = {
  /**
   * Buscar todas as permissões de menu
   */
  async getAll(): Promise<RoleMenuPermission[]> {
    const { data, error } = await supabase
      .from("role_menu_permissions")
      .select("*")
      .order("role", { ascending: true })
      .order("menu_item", { ascending: true });

    if (error) throw error;
    return (data as unknown as RoleMenuPermission[]) || [];
  },

  /**
   * Buscar permissões de um perfil específico
   */
  async getByRole(role: UserRole): Promise<RoleMenuPermission[]> {
    const { data, error } = await supabase
      .from("role_menu_permissions")
      .select("*")
      .eq("role", role)
      .order("menu_item", { ascending: true });

    if (error) throw error;
    return (data as unknown as RoleMenuPermission[]) || [];
  },

  /**
   * Verificar se um perfil tem acesso a um menu
   */
  async canAccess(role: UserRole, menuItem: MenuItem): Promise<boolean> {
    const { data, error } = await supabase
      .from("role_menu_permissions")
      .select("can_access")
      .eq("role", role)
      .eq("menu_item", menuItem)
      .single();

    if (error) {
      console.error("Error checking menu permission:", error);
      return false;
    }

    return data?.can_access || false;
  },

  /**
   * Atualizar permissão de menu
   */
  async update(role: UserRole, menuItem: MenuItem, canAccess: boolean): Promise<void> {
    const { error } = await supabase
      .from("role_menu_permissions")
      .update({ 
        can_access: canAccess,
        updated_at: new Date().toISOString()
      })
      .eq("role", role)
      .eq("menu_item", menuItem);

    if (error) throw error;
  },

  /**
   * Resetar permissões para o padrão
   */
  async resetToDefault(): Promise<void> {
    const defaultPermissions = [
      // Admin tem acesso a tudo
      { role: "admin", menu_item: "dashboard", can_access: true },
      { role: "admin", menu_item: "properties", can_access: true },
      { role: "admin", menu_item: "tenants", can_access: true },
      { role: "admin", menu_item: "rentals", can_access: true },
      { role: "admin", menu_item: "payments", can_access: true },
      { role: "admin", menu_item: "financial", can_access: true },
      { role: "admin", menu_item: "settings", can_access: true },

      // Corretor tem acesso operacional
      { role: "broker", menu_item: "dashboard", can_access: true },
      { role: "broker", menu_item: "properties", can_access: true },
      { role: "broker", menu_item: "tenants", can_access: true },
      { role: "broker", menu_item: "rentals", can_access: true },
      { role: "broker", menu_item: "payments", can_access: true },
      { role: "broker", menu_item: "financial", can_access: false },
      { role: "broker", menu_item: "settings", can_access: false },

      // Financeiro tem acesso limitado
      { role: "financial", menu_item: "dashboard", can_access: true },
      { role: "financial", menu_item: "properties", can_access: false },
      { role: "financial", menu_item: "tenants", can_access: false },
      { role: "financial", menu_item: "rentals", can_access: false },
      { role: "financial", menu_item: "payments", can_access: false },
      { role: "financial", menu_item: "financial", can_access: true },
      { role: "financial", menu_item: "settings", can_access: false },
    ];

    for (const perm of defaultPermissions) {
      await supabase
        .from("role_menu_permissions")
        .upsert(perm, { onConflict: "role,menu_item" });
    }
  },
};