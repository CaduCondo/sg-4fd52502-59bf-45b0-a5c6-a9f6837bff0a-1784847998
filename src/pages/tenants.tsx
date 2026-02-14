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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    tenants,
    isLoading,
    createTenant,
    updateTenant,
    deleteTenant,
  } = useTenants();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"alphabetical" | "recent">("alphabetical");

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
    setIsFormOpen(true);
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsViewMode(true);
    setIsFormOpen(true);
  };

  const handleEditTenant = (tenant: Tenant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTenant(tenant);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    let success = false;
    
    if (selectedTenant) {
      // Edit existing
      success = await updateTenant(selectedTenant.id, data);
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Inquilino atualizado com sucesso.",
        });
      }
    } else {
      // Create new
      success = await createTenant(data);
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Inquilino criado com sucesso.",
        });
      }
    }

    if (success) {
      setIsFormOpen(false);
    }
    return success;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativo", variant: "default" as const },
      inactive: { label: "Inativo", variant: "secondary" as const },
      rented: { label: "Locado", variant: "default" as const },
      locatario: { label: "Locatário", variant: "default" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDocument = (tenant: Tenant) => {
    if (tenant.documentType === "cpf" && tenant.cpf) {
      return tenant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    if (tenant.documentType === "cnpj" && tenant.document) {
      return tenant.document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return tenant.document || tenant.cpf || "-";
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "-";
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const getRowClassName = (tenant: Tenant) => {
    const baseClasses = "cursor-pointer hover:bg-muted/50 transition-colors";
    if (tenant.status === "active" || tenant.status === "rented") {
      return `${baseClasses} bg-green-50 dark:bg-green-950/20`;
    }
    return `${baseClasses} bg-gray-100 dark:bg-gray-800`;
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
              <h1 className="text-3xl font-bold mb-1">Inquilinos</h1>
              <p className="text-sm text-muted-foreground">Gerencie os inquilinos dos seus imóveis</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grade
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
              <Button onClick={handleCreateNew}>
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
          onStatusFilterChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
          sortBy={sortBy as "alphabetical" | "recent"}
          onSortChange={(value) => setSortBy(value as "alphabetical" | "recent")}
          totalCount={tenants.length}
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
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onClick={() => handleViewTenant(tenant)}
                onDelete={() => handleDelete(tenant.id)}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className={getRowClassName(tenant)}
                    onClick={() => handleViewTenant(tenant)}
                  >
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{formatDocument(tenant)}</TableCell>
                    <TableCell>{formatPhone(tenant.phone)}</TableCell>
                    <TableCell>{tenant.email || "-"}</TableCell>
                    <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTenant(tenant);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditTenant(tenant, e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(tenant.id, e)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <TenantFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setSelectedTenant(null);
          }}
          onSave={handleSave}
          tenant={selectedTenant || undefined}
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