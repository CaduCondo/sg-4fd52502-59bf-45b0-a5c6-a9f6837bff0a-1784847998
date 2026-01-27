import { RoleMenuPermission } from "@/types";

export const roleMenuPermissionService = {
  async getAll(): Promise<RoleMenuPermission[]> {
    console.log("=== FETCHING ROLE PERMISSIONS VIA NEXT.JS API ROUTE ===");
    
    try {
      const response = await fetch("/api/role-menu-permissions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.length} role permissions`);
      return data;
    } catch (error) {
      console.error("Error fetching role menu permissions:", error);
      // Fallback para array vazio para não quebrar a UI
      return [];
    }
  },

  async getByRole(role: string): Promise<RoleMenuPermission[]> {
    // Filtragem no cliente para evitar muitas requisições, já que a lista é pequena
    const all = await this.getAll();
    return all.filter(p => p.role === role);
  }
};