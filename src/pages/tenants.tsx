import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Eye, Pencil, Trash2, Search } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { TenantCard } from "@/components/tenants/TenantCard";
import { TenantFormDialog } from "@/components/tenants/TenantFormDialog";
import { TenantDeleteAlert } from "@/components/tenants/TenantDeleteAlert";
import { Tenant } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  new: { label: "Novo", variant: "default" as const, className: "bg-blue-500 text-white hover:bg-blue-600" },
  active: { label: "Ativo", variant: "default" as const, className: "bg-green-500 text-white hover:bg-green-600" },
  inactive: { label: "Inativo", variant: "destructive" as const, className: "bg-red-500 text-white hover:bg-red-600" },
  rented: { label: "Locatário", variant: "default" as const, className: "bg-blue-500 text-white hover:bg-blue-600" },
  late: { label: "Inadimplente", variant: "destructive" as const, className: "bg-red-500 text-white hover:bg-red-600" },
  debt: { label: "Em Débito", variant: "destructive" as const, className: "bg-orange-500 text-white hover:bg-orange-600" },
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
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Não usar filtro de status
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

    // NÃO FILTRAR POR STATUS - SEMPRE MOSTRAR TODOS

    if (sortBy === "alphabetical") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - 
        new Date(a.createdAt || 0).getTime()
      );
    }

    return filtered;
  }, [tenants, searchTerm, sortBy, formatDocument, formatPhone]);

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
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  }, []);

  const getRowClassName = useCallback((tenant: Tenant) => {
    // Classes padrão neutras - sem fundo colorido
    return "cursor-pointer hover:bg-muted/50 transition-colors";
  }, []);

  const tableRows = useMemo(() => (
    filteredTenants.map((tenant) => (
      <TableRow
        key={tenant.id}
        className={getRowClassName(tenant)}
        onClick={() => handleViewTenant(tenant)}
      >
        <TableCell className="font-semibold text-blue-600">{tenant.name}</TableCell>
        <TableCell className="text-slate-600">{formatDocument(tenant)}</TableCell>
        <TableCell className="text-slate-600">{formatPhone(tenant.phone)}</TableCell>
        <TableCell className="text-slate-600">{tenant.email || "-"}</TableCell>
        <TableCell>{getStatusBadge(tenant.status)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                handleViewTenant(tenant);
              }}
              title="Visualizar"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
              onClick={(e) => handleEditTenant(tenant, e)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => handleDelete(tenant.id, e)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
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
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground font-medium">
                  {filteredTenants.length} {filteredTenants.length === 1 ? "inquilino encontrado" : "inquilinos encontrados"}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 lg:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, documento, telefone ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="hidden lg:flex gap-3 ml-auto">
                  <Select value={sortBy} onValueChange={(value: "alphabetical" | "recent") => setSortBy(value)}>
                    <SelectTrigger className="w-[140px] h-10">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alphabetical">A-Z</SelectItem>
                      <SelectItem value="recent">Recentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredTenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum inquilino encontrado com o termo de busca." 
                : "Nenhum inquilino encontrado."}
            </p>
            {!searchTerm && (
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