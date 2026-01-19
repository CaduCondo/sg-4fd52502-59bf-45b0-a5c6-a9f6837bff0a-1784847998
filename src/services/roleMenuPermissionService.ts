import { RoleMenuPermission } from "@/types";
import { 
  getWithFilter, 
  createSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "role_menu_permissions";

export async function getRoleMenuPermissions(role: string): Promise<RoleMenuPermission[]> {
  return getWithFilter<RoleMenuPermission>(TABLE, { column: "role", value: role });
}

export async function updateRoleMenuPermission(role: string, menuId: string, enabled: boolean): Promise<void> {
  const permissions = await getRoleMenuPermissions(role);
  const existing = permissions.find(p => p.menu_id === menuId);

  if (enabled && !existing) {
    await createSingle(TABLE, { role, menu_id: menuId });
  } else if (!enabled && existing) {
    await deleteSingle(TABLE, existing.id);
  }
}