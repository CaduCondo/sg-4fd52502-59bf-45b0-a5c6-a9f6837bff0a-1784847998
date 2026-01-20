import { useState, useEffect, useCallback, useMemo } from "react";
import { tenantService } from "@/services";
import { locationService } from "@/services";
import { Tenant, Location } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useTenants() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"alphabetical" | "recent">("alphabetical");

  const loadData = useCallback(async () => {
    if (!user) {
      setTenants([]);
      setLocations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [tenantsData, locationsData] = await Promise.all([
        tenantService.getAll(),
        locationService.getAll(),
      ]);

      setTenants(tenantsData || []);
      setLocations(locationsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os inquilinos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?.id]); // Fixed: only depend on user.id (primitive value), not user object or toast

  const filteredAndSortedTenants = useMemo(() => {
    let filtered = tenants;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(term) ||
          tenant.email?.toLowerCase().includes(term) ||
          tenant.phone?.toLowerCase().includes(term) ||
          tenant.cpf?.toLowerCase().includes(term) ||
          tenant.cnpj?.toLowerCase().includes(term) ||
          tenant.rg?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((tenant) => tenant.status === statusFilter);
    }

    if (selectedLocations.length > 0) {
      filtered = filtered.filter((tenant) =>
        selectedLocations.includes(tenant.location_id || "")
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "alphabetical") {
        return a.name.localeCompare(b.name);
      } else {
        const dateA = a.created_at || a.createdAt || "";
        const dateB = b.created_at || b.createdAt || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
    });

    return sorted;
  }, [tenants, searchTerm, statusFilter, selectedLocations, sortBy]);

  const createTenant = async (data: Partial<Tenant>) => {
    try {
      await tenantService.create(data);
      toast({
        title: "Inquilino criado",
        description: "O inquilino foi criado com sucesso.",
      });
      await loadData();
      return true;
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast({
        title: "Erro ao criar inquilino",
        description: "Não foi possível criar o inquilino.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTenant = async (id: string, data: Partial<Tenant>) => {
    try {
      await tenantService.update(id, data);
      toast({
        title: "Inquilino atualizado",
        description: "O inquilino foi atualizado com sucesso.",
      });
      await loadData();
      return true;
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast({
        title: "Erro ao atualizar inquilino",
        description: "Não foi possível atualizar o inquilino.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      await tenantService.deleteTenant(id);
      toast({
        title: "Inquilino excluído",
        description: "O inquilino foi excluído com sucesso.",
      });
      await loadData();
      return true;
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast({
        title: "Erro ao excluir inquilino",
        description: "Não foi possível excluir o inquilino.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  return {
    tenants: filteredAndSortedTenants,
    locations,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedLocations,
    handleLocationToggle,
    sortBy,
    setSortBy,
    loadData,
    createTenant,
    updateTenant,
    deleteTenant,
  };
}