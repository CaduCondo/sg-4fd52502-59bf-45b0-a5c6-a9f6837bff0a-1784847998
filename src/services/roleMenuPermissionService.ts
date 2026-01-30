import { RoleMenuPermission } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const roleMenuPermissionService = {
  async getAll(): Promise<RoleMenuPermission[]> {
    console.log("=== FETCHING ROLE PERMISSIONS FROM SUPABASE DIRECTLY ===");
    
    try {
      // Usar Supabase client direto ao invés de API route para evitar problemas de network/timeout
      // e aproveitar a autenticação já estabelecida
      const { data, error } = await supabase
        .from('role_menu_permissions')
        .select('*');

      if (error) {
        console.error("❌ Supabase error fetching permissions:", error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} role permissions`);
      return data || [];
    } catch (error) {
      console.error("Error fetching role menu permissions:", error);
      return [];
    }
  },

  async getByRole(role: string): Promise<RoleMenuPermission[]> {
    const all = await this.getAll();
    return all.filter(p => p.role === role);
  }
};