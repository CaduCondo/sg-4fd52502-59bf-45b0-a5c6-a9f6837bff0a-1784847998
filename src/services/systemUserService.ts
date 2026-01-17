import { supabase } from "@/integrations/supabase/client";

export interface SystemUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  password: string;
  role: string; // "admin" | "corretor" | "financeiro"
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const systemUserService = {
  // Buscar todos os usuários
  async getAll(): Promise<SystemUser[]> {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching system users:", error);
      return [];
    }
  },

  // Buscar usuário por ID
  async getById(id: string): Promise<SystemUser | null> {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching system user:", error);
      return null;
    }
  },

  // Buscar usuário por email (para login)
  async getByEmail(email: string): Promise<SystemUser | null> {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching system user by email:", error);
      return null;
    }
  },

  // Criar novo usuário
  async create(user: Omit<SystemUser, "id" | "created_at" | "updated_at">): Promise<SystemUser | null> {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .insert({
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          password: user.password,
          role: user.role,
          active: user.active
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating system user:", error);
      return null;
    }
  },

  // Atualizar usuário
  async update(id: string, updates: Partial<Omit<SystemUser, "id" | "created_at">>): Promise<SystemUser | null> {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating system user:", error);
      return null;
    }
  },

  // Deletar usuário
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("system_users")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting system user:", error);
      return false;
    }
  },

  // Redefinir senha do usuário
  async resetPassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("system_users")
        .update({
          password: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error resetting password:", error);
      return false;
    }
  },

  // Buscar nome do usuário logado (para dashboard)
  async getCurrentUserName(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return "Administrador";

      const { data, error } = await supabase
        .from("system_users")
        .select("name")
        .eq("email", user.email)
        .single();

      if (error || !data) {
        return user.email.split("@")[0];
      }

      return data.name;
    } catch (error) {
      console.error("Error fetching current user name:", error);
      return "Administrador";
    }
  }
};