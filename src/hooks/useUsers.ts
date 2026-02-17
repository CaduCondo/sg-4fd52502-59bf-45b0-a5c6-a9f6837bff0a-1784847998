import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SystemUser } from "@/types";
import { updateUser, deleteUser } from "@/services/systemUserService";
import { createSingle } from "@/lib/supabaseHelpers";
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
      
      // Cast explícito para garantir a tipagem correta do role
      const typedUsers: SystemUser[] = (data || []).map((user) => ({
        ...user,
        active: !!user.active,
        status: user.active ? "active" : "inactive",
        role: user.role as "admin" | "financial" | "broker",
        cpf: user.cpf || "",
        auth_user_id: user.auth_user_id || "",
        created_at: user.created_at || new Date().toISOString(),
        usuario: user.usuario || user.email,
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
    password: string;
    role: string;
    phone?: string;
    cpf?: string;
    rg?: string;
    username?: string;
    photo?: string;
  }) => {
    try {
      setIsLoading(true);
      console.log("[useUsers] Creating user with data:", userData);

      const newUser = await createSingle("system_users", {
        name: userData.name,
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        role: userData.role,
        phone: userData.phone || null,
        cpf: userData.cpf || null,
        rg: userData.rg || null,
        username: userData.username || null,
        photo: userData.photo || null,
        active: true,
      });

      console.log("[useUsers] User created successfully:", newUser);
      toast({
        title: "Usuário criado com sucesso!",
        variant: "default",
      });
      await fetchUsers();
      return true;
    } catch (error: any) {
      console.error("[useUsers] Error creating user:", error);
      
      // Tratamento específico para e-mail duplicado
      if (error.message?.includes("duplicate key") && error.message?.includes("email")) {
        toast({
          title: "Este e-mail já está cadastrado",
          description: "Por favor, use outro e-mail.",
          variant: "destructive",
        });
        throw new Error("Este e-mail já está cadastrado. Por favor, use outro e-mail.");
      }
      
      // Tratamento específico para username duplicado
      if (error.message?.includes("duplicate key") && error.message?.includes("username")) {
        toast({
          title: "Este nome de usuário já está cadastrado",
          description: "Por favor, use outro.",
          variant: "destructive",
        });
        throw new Error("Este nome de usuário já está cadastrado. Por favor, use outro.");
      }
      
      // Erro genérico
      toast({
        title: "Erro ao criar usuário",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<SystemUser>) => {
    try {
      const updateData: any = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        username: userData.username,
        role: userData.role,
      };

      if (userData.password && userData.password.trim() !== "") {
        updateData.password = userData.password;
      }

      await updateUser(id, updateData);
      toast({ title: "Usuário atualizado com sucesso!" });
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
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
    error: null, // Basic implementation
    refresh: fetchUsers,
    fetchUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleToggleUserStatus,
  };
}