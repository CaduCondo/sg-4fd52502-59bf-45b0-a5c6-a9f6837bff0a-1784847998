import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, Trash2, LayoutGrid, List } from "lucide-react";
import { Tenant } from "@/types";
import { tenantService } from "@/services";
import { getCurrentUser } from "@/lib/auth";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, removeMask } from "@/lib/masks";
import { isAuthenticatedAsync } from "@/lib/auth";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "rented">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    documentType: "cpf" as "cpf" | "cnpj",
    document: "",
    email: "",
    phone: "",
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
      const data = await tenantService.getAll();
      setTenants(data);
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
          tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((tenant) => tenant.status === statusFilter);
    }

    setFilteredTenants(filtered);
  };

  const handleCardClick = (tenantId: string) => {
    router.push(`/tenants/${tenantId}`);
  };

  const openDialog = () => {
    setFormData({
      name: "",
      documentType: "cpf",
      document: "",
      email: "",
      phone: "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      name: "",
      documentType: "cpf",
      document: "",
      email: "",
      phone: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.document) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e documento.",
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
        status: "active",
      };

      await tenantService.create(tenantData as Omit<Tenant, "id" | "createdAt">);
      toast({ title: "Sucesso", description: "Inquilino cadastrado!" });

      closeDialog();
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
    e.stopPropagation();
    
    const currentUser = getCurrentUser();
    if (currentUser?.role === "corretor" && tenant.status === "rented") {
      toast({
        title: "Ação não permitida",
        description: "Corretores não podem deletar inquilinos locadores.",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este inquilino?")) return;

    try {
      await tenantService.delete(tenant.id);
      toast({ title: "Sucesso", description: "Inquilino excluído!" });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "rented": return "bg-blue-500";
      case "inactive": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "rented": return "Alugado";
      case "inactive": return "Inativo";
      default: return status;
    }
  };

  return (
    <>
      <Head>
        <title>Inquilinos - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-8">
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
            <Button onClick={openDialog} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Inquilino
            </Button>
          </div>

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
                    <SelectItem value="rented">Alugado</SelectItem>
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

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando inquilinos...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
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
                  <Button onClick={openDialog} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Inquilino
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredTenants.map((tenant) => (
                <Card 
                  key={tenant.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 group"
                  onClick={() => handleCardClick(tenant.id)}
                >
                  <CardHeader className="pb-2 p-2.5">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getStatusColor(tenant.status)}>
                        {getStatusLabel(tenant.status)}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm group-hover:text-emerald-600 transition-colors">
                      {tenant.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {tenant.documentType?.toUpperCase()}: {tenant.documentType === "cpf" ? applyCpfMask(tenant.document || "") : applyCnpjMask(tenant.document || "")}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 pb-2 px-2.5">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDelete(e, tenant)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTenants.map((tenant) => (
                <Card 
                  key={tenant.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-300 group"
                  onClick={() => handleCardClick(tenant.id)}
                >
                  <CardContent className="py-2.5 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge className={getStatusColor(tenant.status)}>
                          {getStatusLabel(tenant.status)}
                        </Badge>
                        <div>
                          <h3 className="font-semibold text-sm group-hover:text-emerald-600 transition-colors">{tenant.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {tenant.documentType?.toUpperCase()}: {tenant.documentType === "cpf" ? applyCpfMask(tenant.document || "") : applyCnpjMask(tenant.document || "")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDelete(e, tenant)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Inquilino</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value: "cpf" | "cnpj") => {
                      setFormData({ ...formData, documentType: value, document: "" });
                    }}
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document">
                    {formData.documentType === "cpf" ? "CPF" : "CNPJ"} *
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
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}