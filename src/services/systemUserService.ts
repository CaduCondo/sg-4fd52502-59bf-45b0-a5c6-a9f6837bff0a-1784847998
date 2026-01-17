import { supabase } from "@/integrations/supabase/client";

export interface SystemUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  rg?: string;
  cpf?: string;
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
      return (data as any[]) || [];
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
      return data as any;
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
      return data as any;
    } catch (error) {
      console.error("Error fetching system user by email:", error);
      return null;
    }
  },

  // Buscar usuário por username (para login alternativo)
  async getByUsername(username: string): Promise<SystemUser | null> {
    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      return data as any;
    } catch (error) {
      console.error("Error fetching system user by username:", error);
      return null;
    }
  },

  // Criar novo usuário
  async create(user: Omit<SystemUser, "id" | "created_at" | "updated_at">): Promise<SystemUser | null> {
    try {
      const payload = {
        name: user.name,
        username: user.username || null,
        email: user.email,
        phone: user.phone || null,
        rg: user.rg || null,
        cpf: user.cpf || null,
        password: user.password,
        role: user.role,
        active: user.active
      };

      // Cast the table ref to any to bypass strict type checking for insert
      const { data, error } = await (supabase.from("system_users") as any)
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return data as SystemUser;
    } catch (error) {
      console.error("Error creating system user:", error);
      return null;
    }
  },

  // Atualizar usuário
  async update(id: string, updates: Partial<Omit<SystemUser, "id" | "created_at">>): Promise<SystemUser | null> {
    try {
      const payload: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Garantir que campos opcionais vazios virem null
      if (updates.username === "") payload.username = null;
      if (updates.phone === "") payload.phone = null;
      if (updates.rg === "") payload.rg = null;
      if (updates.cpf === "") payload.cpf = null;

      // Cast the table ref to any to bypass strict type checking for update
      const { data, error } = await (supabase.from("system_users") as any)
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data as SystemUser;
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
      // Verifica se temos um usuário logado no localStorage (sistema customizado)
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("currentUser") : null;
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.name.split(" ")[0];
      }

      if (!user?.email) return "Administrador";

      const { data, error } = await supabase
        .from("system_users")
        .select("name")
        .eq("email", user.email)
        .single();

      if (error || !data) {
        return user.email.split("@")[0];
      }

      const firstName = data.name.split(" ")[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    } catch (error) {
      console.error("Error fetching current user name:", error);
      return "Administrador";
    }
  },

  // Validar login (username ou email + senha)
  async validateLogin(usernameOrEmail: string, password: string): Promise<SystemUser | null> {
    try {
      // Tentar buscar por email primeiro
      let { data, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("email", usernameOrEmail)
        .eq("password", password)
        .eq("active", true)
        .single();

      // Se não encontrar por email, tentar por username
      if (error) {
        const result = await supabase
          .from("system_users")
          .select("*")
          .eq("username", usernameOrEmail)
          .eq("password", password)
          .eq("active", true)
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return data as any;
    } catch (error) {
      console.error("Error validating login:", error);
      return null;
    }
  }
};