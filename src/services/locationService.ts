import { Location } from "@/types";
import { 
  getAll, 
  createSingle, 
  updateSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "locations";

export async function getLocations(): Promise<Location[]> {
  return getAll<Location>(TABLE, { column: "name" });
}

export async function createLocation(location: Omit<Location, "id" | "created_at" | "updated_at">): Promise<Location> {
  return createSingle<Location>(TABLE, location);
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
  return updateSingle<Location>(TABLE, id, updates);
}

export async function deleteLocation(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}