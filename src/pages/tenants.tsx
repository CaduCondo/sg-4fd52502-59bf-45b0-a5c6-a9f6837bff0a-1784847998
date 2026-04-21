import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Eye, Pencil, Trash2 } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { TenantCard } from "@/components/tenants/TenantCard";
import { TenantFilters } from "@/components/tenants/TenantFilters";
import { TenantFormDialog } from "@/components/tenants/TenantFormDialog";
import { TenantDeleteAlert } from "@/components/tenants/TenantDeleteAlert";
import { Tenant } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" as const },
  inactive: { label: "Inativo", variant: "secondary" as const },
  rented: { label: "Locatário", variant: "outline" as const },
  late: { label: "Inadimplente", variant: "destructive" as const },
  debt: { label: "Em Débito", variant: "destructive" as const },
};

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

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    selectedTenant: null as Tenant | null,
    isViewMode: false,
  });
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["active", "rented"]);
  const [sortBy, setSortBy] = useState<"alphabetical" | "recent">("alphabetical");

  const formatDocument = useCallback((tenant: Tenant) => {
    if (tenant.documentType === "cpf" && tenant.cpf) {
      return tenant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    if (tenant.documentType === "cnpj" && tenant.document) {
      return tenant.document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return tenant.document || tenant.cpf || "-";
  }, []);

  const formatPhone = useCallback((phone?: string) => {
    if (!phone) return "-";
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }, []);

  const filteredTenants = useMemo(() => {
    let filtered = tenants;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((tenant) => {
        const name = tenant.name.toLowerCase();
        const doc = formatDocument(tenant).toLowerCase();
        const phone = formatPhone(tenant.phone).toLowerCase();
        const email = (tenant.email || "").toLowerCase();
        
        return name.includes(search) || 
               doc.includes(search) || 
               phone.includes(search) || 
               email.includes(search);
      });
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter((t) => statusFilter.includes(t.status));
    }

    if (sortBy === "alphabetical") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - 
        new Date(a.createdAt || 0).getTime()
      );
    }

    return filtered;
  }, [tenants, searchTerm, statusFilter, sortBy, formatDocument, formatPhone]);

  useEffect(() => {
    const viewId = router.query.view as string;
    if (viewId && tenants.length > 0) {
      const tenant = tenants.find((t) => t.id === viewId);
      if (tenant) {
        setDialogState({
          isOpen: true,
          selectedTenant: tenant,
          isViewMode: true,
        });
        router.replace("/tenants", undefined, { shallow: true });
      }
    }
  }, [router.query.view, tenants, router]);

  const handleCreateNew = useCallback(() => {
    setDialogState({
      isOpen: true,
      selectedTenant: null,
      isViewMode: false,
    });
  }, []);

  const handleViewTenant = useCallback((tenant: Tenant) => {
    setDialogState({
      isOpen: true,
      selectedTenant: tenant,
      isViewMode: true,
    });
  }, []);

  const handleEditTenant = useCallback((tenant: Tenant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDialogState({
      isOpen: true,
      selectedTenant: tenant,
      isViewMode: false,
    });
  }, []);

  const handleDelete = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tenant = tenants.find(t => t.id === id);
    if (tenant) {
      setTenantToDelete(tenant);
    }
  }, [tenants]);

  const handleConfirmDelete = useCallback(async () => {
    if (tenantToDelete) {
      await deleteTenant(tenantToDelete.id);
      setTenantToDelete(null);
    }
  }, [tenantToDelete, deleteTenant]);

  const handleSave = useCallback(async (data: Partial<Tenant>) => {
    const { selectedTenant } = dialogState;
    let success = false;
    
    if (selectedTenant) {
      success = await updateTenant(selectedTenant.id, data);
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Inquilino atualizado com sucesso.",
        });
      }
    } else {
      success = await createTenant(data);
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Inquilino criado com sucesso.",
        });
      }
    }

    if (success) {
      setDialogState({
        isOpen: false,
        selectedTenant: null,
        isViewMode: false,
      });
    }
    return success;
  }, [dialogState, createTenant, updateTenant, toast]);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setDialogState({
        isOpen: false,
        selectedTenant: null,
        isViewMode: false,
      });
    }
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }, []);

  const getRowClassName = useCallback((tenant: Tenant) => {
    const baseClasses = "cursor-pointer hover:bg-muted/50 transition-colors";
    if (tenant.status === "active" || tenant.status === "rented") {
      return `${baseClasses} bg-green-50 dark:bg-green-950/20`;
    }
    return `${baseClasses} bg-gray-100 dark:bg-gray-800`;
  }, []);

  const tableRows = useMemo(() => (
    filteredTenants.map((tenant) => (
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
    ))
  ), [filteredTenants, getRowClassName, formatDocument, formatPhone, getStatusBadge, handleViewTenant, handleEditTenant, handleDelete]);

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

        <Card>
          <CardContent>
            <TenantFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortBy={sortBy}
              onSortChange={(value) => setSortBy(value as "alphabetical" | "recent")}
              totalCount={filteredTenants.length}
            />
          </CardContent>
        </Card>

        {filteredTenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm || statusFilter.length !== 3 
                ? "Nenhum inquilino encontrado com os filtros aplicados." 
                : "Nenhum inquilino encontrado."}
            </p>
            {!searchTerm && statusFilter.length === 3 && (
              <Button onClick={handleCreateNew} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Inquilino
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => (
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
                {tableRows}
              </TableBody>
            </Table>
          </div>
        )}

        <TenantFormDialog
          open={dialogState.isOpen}
          onOpenChange={handleDialogClose}
          onSave={handleSave}
          tenant={dialogState.selectedTenant || undefined}
          isViewMode={dialogState.isViewMode}
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