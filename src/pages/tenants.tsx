import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, Trash2, LayoutGrid, List } from "lucide-react";
import { Tenant } from "@/types";
import { tenantService } from "@/services";
import { getCurrentUser } from "@/lib/auth";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, removeMask } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "rented">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    documentType: "cpf" as "cpf" | "cnpj",
    document: "",
    email: "",
    phone: "",
  });

  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    document: "",
    documentType: "cpf",
  });

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, searchTerm, statusFilter]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const tenantsData = await tenantService.getAll();
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os inquilinos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTenants = () => {
    let filtered = [...tenants];

    if (searchTerm) {
      filtered = filtered.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((tenant) => tenant.status === statusFilter);
    }

    setFilteredTenants(filtered);
  };

  const handleOpenDialog = (tenant?: Tenant, viewMode?: boolean) => {
    if (tenant) {
      setCurrentTenant(tenant);
      setFormData({
        name: tenant.name,
        documentType: tenant.documentType || "cpf",
        document: tenant.documentType === "cpf" 
          ? applyCpfMask(tenant.document || "") 
          : applyCnpjMask(tenant.document || ""),
        email: tenant.email || "",
        phone: applyPhoneMask(tenant.phone || ""),
      });
      setIsViewMode(!!viewMode);
    } else {
      setCurrentTenant(null);
      setFormData({
        name: "",
        documentType: "cpf",
        document: "",
        email: "",
        phone: "",
      });
      setIsViewMode(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentTenant(null);
    setIsViewMode(false);
    setFormData({
      name: "",
      documentType: "cpf",
      document: "",
      email: "",
      phone: "",
    });
  };

  const handleEdit = () => {
    setIsViewMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "Campo obrigatório",
        description: "O nome completo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.document) {
      toast({
        title: "Campo obrigatório",
        description: "O documento (CPF/CNPJ) é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tenantData: Partial<Tenant> = {
        name: formData.name,
        documentType: formData.documentType,
        document: removeMask(formData.document),
        email: formData.email || undefined,
        phone: removeMask(formData.phone) || undefined,
        status: currentTenant?.status || "active",
      };

      if (currentTenant) {
        await tenantService.update({ ...currentTenant, ...tenantData } as Tenant);
        toast({
          title: "Sucesso",
          description: "Inquilino atualizado com sucesso!",
        });
      } else {
        await tenantService.create(tenantData as Omit<Tenant, "id" | "createdAt">);
        toast({
          title: "Sucesso",
          description: "Inquilino cadastrado com sucesso!",
        });
      }

      handleCloseDialog();
      loadTenants();
    } catch (error) {
      console.error("Error saving tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o inquilino.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, tenant: Tenant) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if corretor is trying to delete rented tenant
    const currentUser = getCurrentUser();
    if (currentUser?.role === "corretor" && tenant.status === "rented") {
      toast({
        title: "Ação não permitida",
        description: "Corretores não podem deletar inquilinos com status locador.",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este inquilino?")) return;

    try {
      await tenantService.delete(tenant.id);
      toast({
        title: "Sucesso",
        description: "Inquilino excluído com sucesso!",
      });
      loadTenants();
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o inquilino.",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (tenant: Tenant) => {
    handleOpenDialog(tenant, true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "rented":
        return "bg-blue-500";
      case "inactive":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "rented":
        return "Locador";
      case "inactive":
        return "Inativo";
      default:
        return status;
    }
  };

  return (
    <>
      <Head>
        <title>Inquilinos - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-8">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  <Users className="h-8 w-8 text-emerald-600" />
                  Inquilinos
                </h1>
                <p className="text-muted-foreground mt-2">
                  Gerencie todos os inquilinos cadastrados
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Inquilino
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar inquilinos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="rented">Locador</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando inquilinos...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <ScrollReveal delay={0.2}>
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum inquilino encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all"
                      ? "Tente ajustar os filtros de busca"
                      : "Comece cadastrando seu primeiro inquilino"}
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Inquilino
                    </Button>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredTenants.map((tenant, index) => (
                <FloatingCard key={tenant.id} delay={index * 0.05}>
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 group"
                    onClick={() => handleCardClick(tenant)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={getStatusColor(tenant.status)}>
                          {getStatusLabel(tenant.status)}
                        </Badge>
                      </div>
                      <CardTitle className="text-base group-hover:text-emerald-600 transition-colors">
                        {tenant.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {tenant.documentType?.toUpperCase()}: {tenant.documentType === "cpf" ? applyCpfMask(tenant.document || "") : applyCnpjMask(tenant.document || "")}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDelete(e, tenant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTenants.map((tenant, index) => (
                <FloatingCard key={tenant.id} delay={index * 0.03}>
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all duration-300 group"
                    onClick={() => handleCardClick(tenant)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Badge className={getStatusColor(tenant.status)}>
                            {getStatusLabel(tenant.status)}
                          </Badge>
                          <div>
                            <h3 className="font-semibold group-hover:text-emerald-600 transition-colors">{tenant.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tenant.documentType?.toUpperCase()}: {tenant.documentType === "cpf" ? applyCpfMask(tenant.document || "") : applyCnpjMask(tenant.document || "")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDelete(e, tenant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              ))}
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isViewMode ? "Detalhes do Inquilino" : currentTenant ? "Editar Inquilino" : "Novo Inquilino"}
              </DialogTitle>
              <DialogDescription>
                {isViewMode ? "Visualize os dados do inquilino" : currentTenant ? "Atualize as informações do inquilino" : "Preencha os dados para cadastrar um novo inquilino"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome completo"
                    disabled={isViewMode}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select
                      value={formData.documentType}
                      onValueChange={(value: "cpf" | "cnpj") => {
                        setFormData({ ...formData, documentType: value, document: "" });
                      }}
                      disabled={isViewMode}
                    >
                      <SelectTrigger id="documentType">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">
                      {formData.documentType === "cpf" ? "CPF" : "CNPJ"} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="document"
                      value={formData.document}
                      onChange={(e) => {
                        const masked = formData.documentType === "cpf" 
                          ? applyCpfMask(e.target.value)
                          : applyCnpjMask(e.target.value);
                        setFormData({ ...formData, document: masked });
                      }}
                      placeholder={formData.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                      disabled={isViewMode}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="exemplo@email.com"
                      disabled={isViewMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                {isViewMode ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Fechar
                    </Button>
                    <Button type="button" onClick={handleEdit} className="bg-emerald-600 hover:bg-emerald-700">
                      Editar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      {currentTenant ? "Salvar Alterações" : "Cadastrar"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}