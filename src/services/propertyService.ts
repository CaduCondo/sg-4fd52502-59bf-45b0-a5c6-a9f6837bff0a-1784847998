import { Property } from "@/types";
import { 
  getAll as fetchAll, 
  getSingle, 
  createSingle, 
  updateSingle, 
  deleteSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "properties";

export async function getAllProperties(): Promise<Property[]> {
  return fetchAll<Property>(TABLE);
}

// Alias
export const getAll = getAllProperties;

export async function getPropertyById(id: string): Promise<Property> {
  return getSingle<Property>(TABLE, id);
}

// Alias
export const getById = getPropertyById;

export async function createProperty(data: Partial<Property>): Promise<Property> {
  return createSingle<Property>(TABLE, data);
}

// Alias
export const create = createProperty;

export async function updateProperty(id: string, data: Partial<Property>): Promise<Property> {
  return updateSingle<Property>(TABLE, id, data);
}

// Alias
export const update = updateProperty;

export async function deleteProperty(id: string): Promise<void> {
  return deleteSingle(TABLE, id);
}

// Alias
export const remove = deleteProperty;