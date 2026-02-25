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
      
      // Cast explícito para garantir a tipagem correta do role
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

      // Se uma nova senha foi fornecida, atualizar password_hash
      if (userData.password_hash && userData.password_hash.trim() !== "") {
        updateData.password_hash = userData.password_hash;
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