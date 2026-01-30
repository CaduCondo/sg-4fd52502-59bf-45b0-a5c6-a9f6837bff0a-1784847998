import { RoleMenuPermission } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const roleMenuPermissionService = {
  async getAll(): Promise<RoleMenuPermission[]> {
    console.log("=== FETCHING ROLE PERMISSIONS FROM SUPABASE DIRECTLY ===");
    
    try {
      // Importante: A coluna no banco é 'menu_item', mas a interface espera 'menu_id'
      // Vamos fazer o mapeamento correto aqui
      const { data, error } = await supabase
        .from('role_menu_permissions')
        .select('*');

      if (error) {
        console.error("❌ Supabase error fetching permissions:", error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} role permissions`);
      
      // Mapear menu_item para menu_id para compatibilidade com a interface RoleMenuPermission
      return (data || []).map((item: any) => ({
        ...item,
        menu_id: item.menu_item // Mapeia a coluna do banco para a propriedade esperada
      }));
    } catch (error) {
      console.error("Error fetching role menu permissions:", error);
      return [];
    }
  },

  async getByRole(role: string): Promise<RoleMenuPermission[]> {
    const all = await this.getAll();
    return all.filter(p => p.role === role);
  },

  async updatePermission(role: string, menuItem: string, hasAccess: boolean): Promise<boolean> {
    try {
      if (hasAccess) {
        // Inserir permissão (usando menu_item conforme banco)
        const { error } = await supabase
          .from('role_menu_permissions')
          .upsert(
            { role, menu_item: menuItem, can_access: true },
            { onConflict: 'role,menu_item' }
          );
          
        if (error) throw error;
      } else {
        // Remover permissão
        const { error } = await supabase
          .from('role_menu_permissions')
          .delete()
          .eq('role', role)
          .eq('menu_item', menuItem);
          
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error("Error updating permission:", error);
      return false;
    }
  }
};