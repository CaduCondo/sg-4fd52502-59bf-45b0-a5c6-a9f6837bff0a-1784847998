import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SystemUser } from "@/types";
import { createUser, updateUser, deleteUser } from "@/services/systemUserService";
import { useToast } from "@/hooks/use-toast";

export function useUsers() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .order("name");

      if (error) throw error;
      
      const typedUsers: SystemUser[] = (data || []).map((user) => ({
        ...user,
        active: !!user.active,
        status: user.active ? "active" : "inactive",
        role: user.role as "admin" | "financial" | "broker",
        cpf: user.cpf || "",
        auth_user_id: user.auth_user_id || "",
        created_at: user.created_at || new Date().toISOString(),
      }));
      
      setUsers(typedUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (userData: {
    name: string;
    email: string;
    phone?: string;
    username: string;
    role: "admin" | "broker" | "financial";
    password: string;
  }) => {
    try {
      // Verificar se já existe um usuário com este email
      const { data: existingUser } = await supabase
        .from("system_users")
        .select("email")
        .eq("email", userData.email)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Email já cadastrado",
          description: "Já existe um usuário com este email. Por favor, use um email diferente.",
          variant: "destructive",
        });
        return false;
      }

      // Verificar se já existe um usuário com este username
      const { data: existingUsername } = await supabase
        .from("system_users")
        .select("username")
        .eq("username", userData.username)
        .maybeSingle();

      if (existingUsername) {
        toast({
          title: "Usuário já cadastrado",
          description: "Já existe um usuário com este nome de usuário. Por favor, escolha outro.",
          variant: "destructive",
        });
        return false;
      }

      await createUser({
        ...userData,
        active: true,
      });
      
      toast({ title: "Usuário criado com sucesso!" });
      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      
      // Tratamento específico para erros de constraint
      if (error.message?.includes("duplicate key") || error.message?.includes("unique constraint")) {
        if (error.message?.includes("email")) {
          toast({
            title: "Email já cadastrado",
            description: "Já existe um usuário com este email no sistema.",
            variant: "destructive",
          });
        } else if (error.message?.includes("username")) {
          toast({
            title: "Usuário já cadastrado",
            description: "Já existe um usuário com este nome de usuário no sistema.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Dados duplicados",
            description: "Os dados informados já estão em uso. Verifique email e nome de usuário.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao criar usuário",
          description: error.message || "Ocorreu um erro ao criar o usuário.",
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<SystemUser>) => {
    try {
      // Se estiver atualizando o email, verificar se já existe outro usuário com este email
      if (userData.email) {
        const { data: existingUser } = await supabase
          .from("system_users")
          .select("id, email")
          .eq("email", userData.email)
          .neq("id", id)
          .maybeSingle();

        if (existingUser) {
          toast({
            title: "Email já cadastrado",
            description: "Já existe outro usuário com este email. Por favor, use um email diferente.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Se estiver atualizando o username, verificar se já existe outro usuário com este username
      if (userData.username) {
        const { data: existingUsername } = await supabase
          .from("system_users")
          .select("id, username")
          .eq("username", userData.username)
          .neq("id", id)
          .maybeSingle();

        if (existingUsername) {
          toast({
            title: "Usuário já cadastrado",
            description: "Já existe outro usuário com este nome de usuário. Por favor, escolha outro.",
            variant: "destructive",
          });
          return false;
        }
      }

      const updateData: any = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        username: userData.username,
        role: userData.role,
      };

      if (userData.password_hash && userData.password_hash.trim() !== "") {
        updateData.password_hash = userData.password_hash;
      }

      await updateUser(id, updateData);
      toast({ title: "Usuário atualizado com sucesso!" });
      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      
      if (error.message?.includes("duplicate key") || error.message?.includes("unique constraint")) {
        if (error.message?.includes("email")) {
          toast({
            title: "Email já cadastrado",
            description: "Já existe outro usuário com este email no sistema.",
            variant: "destructive",
          });
        } else if (error.message?.includes("username")) {
          toast({
            title: "Usuário já cadastrado",
            description: "Já existe outro usuário com este nome de usuário no sistema.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Dados duplicados",
            description: "Os dados informados já estão em uso por outro usuário.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao atualizar usuário",
          description: error.message || "Ocorreu um erro ao atualizar o usuário.",
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      toast({ title: "Usuário excluído com sucesso!" });
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({ title: "Erro ao excluir usuário", variant: "destructive" });
      return false;
    }
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    try {
      await updateUser(user.id, { active: !user.active });
      toast({
        title: `Usuário ${user.active ? "desativado" : "ativado"} com sucesso!`,
      });
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      toast({
        title: "Erro ao alterar status do usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    users,
    isLoading,
    error: null,
    refresh: fetchUsers,
    fetchUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleToggleUserStatus,
  };
}