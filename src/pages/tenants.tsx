import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Plus, Search, User, LayoutGrid, List } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { TenantCard } from "@/components/tenants/TenantCard";
import { TenantFilters } from "@/components/tenants/TenantFilters";
import { TenantFormDialog } from "@/components/tenants/TenantFormDialog";
import { TenantDeleteAlert } from "@/components/tenants/TenantDeleteAlert";
import { Tenant } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function TenantsPage() {
  const router = useRouter();
  const {
    tenants,
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
    createTenant,
    updateTenant,
    deleteTenant,
  } = useTenants();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Partial<Tenant> | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  useEffect(() => {
    const viewId = router.query.view as string;
    if (viewId && tenants.length > 0) {
      const tenant = tenants.find((t) => t.id === viewId);
      if (tenant) {
        setSelectedTenant(tenant);
        setIsViewMode(true);
        setIsDialogOpen(true);
        router.replace("/tenants", undefined, { shallow: true });
      }
    }
  }, [router.query.view, tenants, router]);

  const handleCreateNew = () => {
    setSelectedTenant(null);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (tenant) {
      setTenantToDelete(tenant);
    }
  };

  const handleConfirmDelete = async () => {
    if (tenantToDelete) {
      await deleteTenant(tenantToDelete.id);
      setTenantToDelete(null);
    }
  };

  const handleSave = async (data: Partial<Tenant>) => {
    if (selectedTenant?.id) {
      return await updateTenant(selectedTenant.id, data);
    } else {
      return await createTenant(data);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando inquilinos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Inquilinos - Gerenciador de Locações"
        description="Gerencie seus inquilinos"
      />

      <div className="space-y-6">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Inquilinos</h1>
              <p className="text-muted-foreground">Gerencie os inquilinos dos seus imóveis</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Inquilino
              </Button>
            </div>
          </div>
        </ScrollReveal>

        <TenantFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum inquilino encontrado.
            </p>
            <Button onClick={handleCreateNew} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Inquilino
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onClick={() => handleViewTenant(tenant)}
                onDelete={() => handleDelete(tenant.id)}
              />
            ))}
          </div>
        )}

        <TenantFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          tenant={selectedTenant}
          onSave={handleSave}
          locations={locations}
          isViewMode={isViewMode}
        />

        <TenantDeleteAlert
          open={!!tenantToDelete}
          tenant={tenantToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTenantToDelete(null)}
        />
      </div>
    </Layout>
  );
}