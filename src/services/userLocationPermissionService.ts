import { UserLocationPermission } from "@/types";
import { 
  getWithFilter, 
  createSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "user_location_permissions";

export async function getUserLocationPermissions(userId: string): Promise<UserLocationPermission[]> {
  return getWithFilter<UserLocationPermission>(TABLE, { column: "user_id", value: userId });
}

export async function updateUserLocationPermission(userId: string, locationId: string, enabled: boolean): Promise<void> {
  const permissions = await getUserLocationPermissions(userId);
  const existing = permissions.find(p => p.location_id === locationId);

  if (enabled && !existing) {
    await createSingle(TABLE, { user_id: userId, location_id: locationId });
  } else if (!enabled && existing) {
    await deleteSingle(TABLE, existing.id);
  }
}