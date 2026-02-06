import { useState, useEffect, useMemo, useCallback } from "react";
import { Tenant, Location } from "@/types";
import {
  getAll as getAllTenants,
  create as createTenant,
  update as updateTenant,
  remove as deleteTenant,
} from "@/services/tenantService";
import { getAll as getAllLocations } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";

export function useTenants() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"alphabetical" | "recent">("alphabetical");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantsData, locationsData] = await Promise.all([
        getAllTenants(),
        getAllLocations(),
      ]);
      setTenants(tenantsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading tenants:", error);
      // Não mostrar toast de erro - pode ser simplesmente que não há dados ainda
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // loadData é memorizado por useCallback, então este efeito não causa loops
    loadData();
  }, [loadData]);

  const handleLocationToggle = useCallback((locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId],
    );
  }, []);

  const createTenantHandler = useCallback(
    async (data: Partial<Tenant>) => {
      try {
        await createTenant(data);
        toast({
          title: "Sucesso!",
          description: "Inquilino criado com sucesso.",
        });
        await loadData();
        return true;
      } catch (error) {
        console.error("Error creating tenant:", error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o inquilino.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, loadData],
  );

  const updateTenantHandler = useCallback(
    async (id: string, data: Partial<Tenant>) => {
      try {
        await updateTenant(id, data);
        toast({
          title: "Sucesso!",
          description: "Inquilino atualizado com sucesso.",
        });
        await loadData();
        return true;
      } catch (error) {
        console.error("Error updating tenant:", error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o inquilino.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, loadData],
  );

  const deleteTenantHandler = useCallback(
    async (id: string) => {
      try {
        await deleteTenant(id);
        toast({
          title: "Sucesso!",
          description: "Inquilino removido com sucesso.",
        });
        await loadData();
      } catch (error) {
        console.error("Error deleting tenant:", error);
        toast({
          title: "Erro",
          description: "Não foi possível remover o inquilino.",
          variant: "destructive",
        });
      }
    },
    [toast, loadData],
  );

  const filteredTenants = useMemo(() => {
    const list = tenants.filter((tenant) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        tenant.name?.toLowerCase().includes(term) ||
        tenant.email?.toLowerCase().includes(term) ||
        tenant.document?.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;

      // Filtro de localização removido pois tenants não possuem location_id direto
      // Se necessário filtrar por localização, precisaria fazer join com rentals
      const matchesLocation = true;

      return matchesSearch && matchesStatus && matchesLocation;
    });

    if (sortBy === "alphabetical") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [tenants, searchTerm, statusFilter, selectedLocations, sortBy]);

  return {
    tenants: filteredTenants,
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
    createTenant: createTenantHandler,
    updateTenant: updateTenantHandler,
    deleteTenant: deleteTenantHandler,
  };
}