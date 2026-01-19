import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/services/authService";
import type { SystemUser } from "@/types";

export const systemUserService = {
  /**
   * Buscar todos os usuários
   */
  async getAll(): Promise<SystemUser[]> {
    try {
      console.log("📡 Buscando todos os usuários...");
      
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar usuários:", error);
        throw error;
      }

      // Casting manual do role para garantir tipagem
      const users = (data || []).map(user => ({
        ...user,
        role: user.role as "admin" | "user" | "broker" | "financial"
      }));

      console.log(`✅ ${users.length} usuários encontrados`);
      return users;
    } catch (error) {
      console.error("❌ Erro ao buscar usuários:", error);
      throw error;
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
      
      return {
        ...data,
        role: data.role as "admin" | "user" | "broker" | "financial"
      } as SystemUser;
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
       return {
        ...data,
        role: data.role as "admin" | "user" | "broker" | "financial"
      } as SystemUser;
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
       return {
        ...data,
        role: data.role as "admin" | "user" | "broker" | "financial"
      } as SystemUser;
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

      const table: any = supabase.from("system_users");
      const { data, error } = await table.insert(payload).select("*").single();

      if (error) throw error;
      
       return {
        ...data,
        role: data.role as "admin" | "user" | "broker" | "financial"
      } as SystemUser;
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

      const table: any = supabase.from("system_users");
      const { data, error } = await table.update(payload).eq("id", id).select("*").single();

      if (error) throw error;
      
       return {
        ...data,
        role: data.role as "admin" | "user" | "broker" | "financial"
      } as SystemUser;
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

  // Redefinir senha do usuário para senha padrão
  async resetPassword(id: string): Promise<boolean> {
    try {
      const defaultPassword = "123456"; // Senha padrão
      
      const { error } = await supabase
        .from("system_users")
        .update({
          password: defaultPassword,
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

  // Desbloquear usuário (ativar conta)
  async unlockUser(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("system_users")
        .update({
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error unlocking user:", error);
      return false;
    }
  },

  // Buscar nome do usuário logado (para dashboard)
  async getCurrentUserName(): Promise<string> {
    try {
      // 1. Tentar pegar do localStorage (sistema atual)
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("currentUser") : null;
      if (storedUser) {
        try {
           const parsedUser = JSON.parse(storedUser);
           // Se tiver ID, buscar nome atualizado no banco
           if (parsedUser.id) {
             const { data } = await supabase.from("system_users").select("name").eq("id", parsedUser.id).single();
             if (data) return data.name.split(" ")[0];
           }
           return parsedUser.name.split(" ")[0];
        } catch (e) {
           return "Usuário";
        }
      }

      // 2. Fallback para Supabase Auth (se vier a ser usado)
      const localUser = getCurrentUser();
      if (!localUser?.email) return "Visitante";

      const { data } = await supabase
        .from("system_users")
        .select("name")
        .eq("email", localUser.email)
        .maybeSingle();

      if (data) {
         const firstName = data.name.split(" ")[0];
         return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }

      return localUser.email.split("@")[0];
    } catch (error) {
      console.error("Error fetching current user name:", error);
      return "Usuário";
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
        .maybeSingle();

      // Se não encontrar por email, tentar por username
      if (!data && !error) {
        const result = await supabase
          .from("system_users")
          .select("*")
          .eq("username", usernameOrEmail)
          .eq("password", password)
          .eq("active", true)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        role: data.role as "admin" | "user" | "broker" | "financial"
      } as SystemUser;
    } catch (error) {
      console.error("Error validating login:", error);
      return null;
    }
  }
};