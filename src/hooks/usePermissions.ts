import { useState, useEffect, useCallback } from "react";
import { roleMenuPermissionService } from "@/services/roleMenuPermissionService";
import { locationPermissionService } from "@/services/locationPermissionService";
import * as adminFeeExemptionService from "@/services/adminFeeExemptionService";
import { RoleMenuPermission } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<RoleMenuPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roleMenuPermissionService.getAll();
      setPermissions(data);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const updateRoleMenuPermission = async (
    role: string,
    menuItem: string,
    hasAccess: boolean
  ) => {
    try {
      await roleMenuPermissionService.updatePermission(role, menuItem, hasAccess);
      await loadPermissions();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
      return false;
    }
  };

  const saveLocationPermissions = async (userId: string, locationIds: string[]) => {
    try {
      // Deletar permissões antigas
      const existingPermissions = await locationPermissionService.getUserPermissions(userId);
      for (const perm of existingPermissions) {
        await locationPermissionService.deletePermission(userId, perm.location_id);
      }

      // Criar novas permissões
      for (const locationId of locationIds) {
        await locationPermissionService.grantFullAccess(userId, locationId);
      }

      toast({
        title: "Sucesso",
        description: "Permissões de locais salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar permissões de locais:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar permissões de locais.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Funções de Isenção de Taxa (AGORA GLOBAIS)
  const saveFeeExemptions = async (locationIds: string[]) => {
    try {
      await adminFeeExemptionService.setExemptLocations(locationIds);
      return true;
    } catch (error) {
      console.error("Erro ao salvar isenções:", error);
      return false;
    }
  };

  const getFeeExemptions = async () => {
    try {
      return await adminFeeExemptionService.getExemptLocations();
    } catch (error) {
      console.error("Erro ao buscar isenções:", error);
      return [];
    }
  };

  const getUserLocationPermissions = async (userId: string) => {
    try {
      const permissions = await locationPermissionService.getUserPermissions(userId);
      return permissions.map(p => p.location_id);
    } catch (error) {
      console.error("Erro ao buscar permissões de locais do usuário:", error);
      return [];
    }
  };

  const hasPermission = useCallback((menuItem: string) => {
    if (!user) return false;
    // Admins have access to everything
    if (user.role === 'admin' || user.role === 'administrador') return true;
    
    const permission = permissions.find(
      p => p.role === user.role && p.menu === menuItem
    );
    return permission ? (permission.can_view || permission.can_edit || permission.can_delete) : false;
  }, [user, permissions]);

  return {
    permissions,
    loading,
    refresh: loadPermissions,
    updateRoleMenuPermission,
    saveLocationPermissions,
    saveFeeExemptions,
    getFeeExemptions,
    getUserLocationPermissions,
    hasPermission,
  };
}