import { supabase } from "@/integrations/supabase/client";

export interface RoleMenuPermission {
  id?: string;
  role: string;
  menu_item: string;
  can_access: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function getRoleMenuPermissions(role?: string): Promise<RoleMenuPermission[]> {
  let query = supabase
    .from("role_menu_permissions")
    .select("*");
    
  if (role) {
    query = query.eq("role", role);
  } else {
    query = query.order("role", { ascending: true });
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function updateRoleMenuPermission(permission: Partial<RoleMenuPermission> & { role: string; menu_item: string }): Promise<RoleMenuPermission> {
  // Ensure we only send valid fields to Supabase
  const payload = {
    role: permission.role,
    menu_item: permission.menu_item,
    can_access: permission.can_access,
  };

  const { data, error } = await supabase
    .from("role_menu_permissions")
    .upsert(payload, { onConflict: "role,menu_item" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from("role_menu_permissions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}