import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleMenuPermission, UserLocationPermission } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();
  const [roleMenuPermissions, setRoleMenuPermissions] = useState<RoleMenuPermission[]>([]);
  const [locationPermissions, setLocationPermissions] = useState<UserLocationPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const fetchedRef = useRef(false);

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
        menu_id: p.menu_item,
        created_at: p.created_at
      }));

      setRoleMenuPermissions(typedPermissions);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
    }
  };

  const fetchLocationPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("user_location_permissions")
        .select("*");

      if (error) throw error;
      setLocationPermissions(data as UserLocationPermission[] || []);
    } catch (error) {
      console.error("Erro ao carregar permissões de local:", error);
    }
  };

  const fetchAll = async () => {
    if (!user) return;
    setIsLoading(true);
    await Promise.all([fetchRoleMenuPermissions(), fetchLocationPermissions()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && !fetchedRef.current) {
      fetchAll().then(() => {
        fetchedRef.current = true;
      });
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user]);

  const updateRoleMenuPermission = async (
    role: string,
    menuItem: string,
    hasAccess: boolean
  ) => {
    try {
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
      await supabase
        .from("user_location_permissions")
        .delete()
        .eq("user_id", userId);

      if (locationIds.length > 0) {
        const permissionsToInsert = locationIds.map(locationId => ({
          user_id: userId,
          location_id: locationId,
        }));

        const { error } = await supabase
          .from("user_location_permissions")
          .insert(permissionsToInsert);
          
        if (error) throw error;
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
        .from("broker_fee_exemptions")
        .select("location_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data?.map(p => p.location_id) || [];
    } catch (error) {
      console.error("Erro ao carregar isenções de taxa:", error);
      return [];
    }
  };
  
  const saveFeeExemptions = async (userId: string, locationIds: string[]) => {
    try {
      await supabase
        .from("broker_fee_exemptions")
        .delete()
        .eq("user_id", userId);

      if (locationIds.length > 0) {
        const exemptionsToInsert = locationIds.map(locationId => ({
          user_id: userId,
          location_id: locationId,
        }));

        const { error } = await supabase
          .from("broker_fee_exemptions")
          .insert(exemptionsToInsert);
          
        if (error) throw error;
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
    permissions: roleMenuPermissions,
    roleMenuPermissions,
    locationPermissions,
    loading: isLoading,
    fetchAll,
    updateRoleMenuPermission,
    saveLocationPermissions,
    saveFeeExemptions,
    getUserLocationPermissions,
    getUserFeeExemptions,
  };
}