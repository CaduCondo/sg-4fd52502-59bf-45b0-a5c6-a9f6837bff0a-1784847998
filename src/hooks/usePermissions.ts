import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RoleMenuPermission {
  id: string;
  role: string;
  menu_item: string;
  can_access: boolean;
}

interface LocationPermission {
  id: string;
  user_id: string;
  location_id: string;
}

export function usePermissions() {
  const [roleMenuPermissions, setRoleMenuPermissions] = useState<RoleMenuPermission[]>([]);
  const [locationPermissions, setLocationPermissions] = useState<LocationPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRoleMenuPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("role_menu_permissions")
        .select("*")
        .order("role");

      if (error) throw error;
      
      const typedPermissions: RoleMenuPermission[] = (data || []).map(p => ({
        id: p.id,
        role: p.role,
        menu_item: p.menu_item,
        can_access: p.can_access || false
      }));

      setRoleMenuPermissions(typedPermissions);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro ao carregar permissões de menu",
        variant: "destructive",
      });
    }
  };

  const fetchLocationPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("user_location_permissions")
        .select("*");

      if (error) throw error;
      setLocationPermissions(data || []);
    } catch (error) {
      console.error("Erro ao carregar permissões de local:", error);
      toast({
        title: "Erro ao carregar permissões de local",
        variant: "destructive",
      });
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchRoleMenuPermissions(), fetchLocationPermissions()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateRoleMenuPermission = async (
    role: string,
    menuItem: string,
    hasAccess: boolean
  ) => {
    try {
      // Primeiro verificamos se já existe
      const { data: existing } = await supabase
        .from("role_menu_permissions")
        .select("id")
        .eq("role", role)
        .eq("menu_item", menuItem)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("role_menu_permissions")
          .update({ can_access: hasAccess })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_menu_permissions")
          .insert({ role, menu_item: menuItem, can_access: hasAccess });
        if (error) throw error;
      }
      
      toast({ title: "Permissão atualizada com sucesso!" });
      await fetchRoleMenuPermissions();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
      toast({
        title: "Erro ao atualizar permissão",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveLocationPermissions = async (userId: string, locationIds: string[]) => {
    try {
      const { data: existingPermissions } = await supabase
        .from("user_location_permissions")
        .select("location_id")
        .eq("user_id", userId);

      const existingLocationIds = existingPermissions?.map(p => p.location_id) || [];

      const toRemove = existingLocationIds.filter(id => !locationIds.includes(id));
      if (toRemove.length > 0) {
        await supabase
          .from("user_location_permissions")
          .delete()
          .eq("user_id", userId)
          .in("location_id", toRemove);
      }

      const toAdd = locationIds.filter(id => !existingLocationIds.includes(id));
      if (toAdd.length > 0) {
        const permissionsToInsert = toAdd.map(locationId => ({
          user_id: userId,
          location_id: locationId,
        }));

        await supabase
          .from("user_location_permissions")
          .insert(permissionsToInsert);
      }

      toast({ title: "Permissões de local salvas com sucesso!" });
      await fetchLocationPermissions();
      return true;
    } catch (error) {
      console.error("Erro ao salvar permissões de local:", error);
      toast({
        title: "Erro ao salvar permissões de local",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserLocationPermissions = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from("user_location_permissions")
        .select("location_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data?.map(p => p.location_id) || [];
    } catch (error) {
      console.error("Erro ao carregar permissões de local:", error);
      return [];
    }
  };

  const getUserFeeExemptions = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from("user_fee_exemptions")
        .select("location_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data?.map(e => e.location_id) || [];
    } catch (error) {
      console.error("Erro ao carregar isenções de taxa:", error);
      return [];
    }
  };

  const saveFeeExemptions = async (userId: string, locationIds: string[]) => {
    try {
      const { data: existingExemptions } = await supabase
        .from("user_fee_exemptions")
        .select("location_id")
        .eq("user_id", userId);

      const existingLocationIds = existingExemptions?.map(e => e.location_id) || [];

      const toRemove = existingLocationIds.filter(id => !locationIds.includes(id));
      if (toRemove.length > 0) {
        await supabase
          .from("user_fee_exemptions")
          .delete()
          .eq("user_id", userId)
          .in("location_id", toRemove);
      }

      const toAdd = locationIds.filter(id => !existingLocationIds.includes(id));
      if (toAdd.length > 0) {
        const exemptionsToInsert = toAdd.map(locationId => ({
          user_id: userId,
          location_id: locationId,
        }));

        await supabase
          .from("user_fee_exemptions")
          .insert(exemptionsToInsert);
      }

      toast({ title: "Isenções de taxa salvas com sucesso!" });
      return true;
    } catch (error) {
      console.error("Erro ao salvar isenções de taxa:", error);
      toast({
        title: "Erro ao salvar isenções de taxa",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    roleMenuPermissions,
    locationPermissions,
    isLoading,
    fetchAll,
    updateRoleMenuPermission,
    saveLocationPermissions,
    saveFeeExemptions,
    getUserLocationPermissions,
    getUserFeeExemptions,
  };
}