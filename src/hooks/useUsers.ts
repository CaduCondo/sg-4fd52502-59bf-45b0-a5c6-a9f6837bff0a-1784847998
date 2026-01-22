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
      setUsers(data || []);
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
      await createUser({
        ...userData,
        active: true,
      });
      toast({ title: "Usuário criado com sucesso!" });
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast({ title: "Erro ao criar usuário", variant: "destructive" });
      return false;
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
    fetchUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleToggleUserStatus,
  };
}