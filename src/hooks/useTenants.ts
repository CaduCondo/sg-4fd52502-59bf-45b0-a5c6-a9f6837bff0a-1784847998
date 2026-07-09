import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [statusFilter, setStatusFilter] = useState<string[]>(["active", "rented"]); // Padrão: Ativo e Locatário
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
      // Não mostrar toast de erro - pode ser simplesmente que não há dados ainda
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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
    let list = tenants;

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((tenant) =>
        tenant.name?.toLowerCase().includes(term) ||
        tenant.email?.toLowerCase().includes(term) ||
        tenant.document?.includes(searchTerm)
      );
    }

    // Filtro de status (multi-select)
    if (statusFilter.length > 0) {
      list = list.filter((tenant) => statusFilter.includes(tenant.status));
    }

    // Ordenação
    if (sortBy === "alphabetical") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [tenants, searchTerm, statusFilter, sortBy]);

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