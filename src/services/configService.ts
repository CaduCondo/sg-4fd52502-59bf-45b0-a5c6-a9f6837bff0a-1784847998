import { CompanyConfig } from "@/types";
import { 
  getAll, 
  updateSingle, 
  createSingle 
} from "@/lib/supabaseHelpers";

const TABLE = "configs";

export async function getConfig(): Promise<CompanyConfig | null> {
  const configs = await getAll<CompanyConfig>(TABLE);
  return configs[0] || null;
}

export async function updateConfig(config: Partial<CompanyConfig>): Promise<CompanyConfig> {
  const current = await getConfig();

  if (current) {
    return updateSingle<CompanyConfig>(TABLE, current.id, {
      ...config,
      updated_at: new Date().toISOString()
    });
  } else {
    return createSingle<CompanyConfig>(TABLE, config);
  }
}