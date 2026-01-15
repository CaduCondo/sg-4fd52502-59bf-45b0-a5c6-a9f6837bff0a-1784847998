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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, Edit, Eye, Mail, Phone, FileText } from "lucide-react";
import { Tenant } from "@/types";
import { tenantService } from "@/services";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, removeMask } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "renter">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf" as "cpf" | "cnpj",
    document: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, searchTerm, statusFilter]);

  const loadData = async () => {
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
          tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.document.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((tenant) => tenant.status === statusFilter);
    }

    setFilteredTenants(filtered);
  };

  const handleOpenDialog = (tenant?: Tenant, viewMode = false) => {
    if (tenant) {
      setCurrentTenant(tenant);
      setFormData({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        documentType: tenant.documentType,
        document: tenant.document,
      });
      setIsViewMode(viewMode);
    } else {
      setCurrentTenant(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        documentType: "cpf",
        document: "",
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
      email: "",
      phone: "",
      documentType: "cpf",
      document: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.document) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tenantData: Partial<Tenant> = {
        name: formData.name,
        email: formData.email,
        phone: removeMask(formData.phone),
        documentType: formData.documentType,
        document: removeMask(formData.document),
        status: "active",
      };

      if (currentTenant) {
        await tenantService.update(currentTenant.id, tenantData);
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
      loadData();
    } catch (error) {
      console.error("Error saving tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o inquilino.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm("Tem certeza que deseja excluir este inquilino?")) return;

    try {
      await tenantService.delete(tenant.id);
      toast({
        title: "Sucesso",
        description: "Inquilino excluído com sucesso!",
      });
      loadData();
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
      case "active":
        return "bg-green-500";
      case "renter":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "renter":
        return "Locador";
      default:
        return status;
    }
  };

  const handleDocumentChange = (value: string) => {
    const masked = formData.documentType === "cpf" ? applyCpfMask(value) : applyCnpjMask(value);
    setFormData({ ...formData, document: masked });
  };

  return (
    <>
      <Head>
        <title>Inquilinos - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
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

          {/* Filters */}
          <ScrollReveal delay={0.1}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, e-mail ou documento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="renter">Locador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Tenants Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando inquilinos...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <ScrollReveal delay={0.2}>
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum inquilino encontrado</p>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all"
                      ? "Tente ajustar os filtros de busca"
                      : "Comece cadastrando seu primeiro inquilino"}
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Cadastrar Primeiro Inquilino
                    </Button>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map((tenant, index) => (
                <FloatingCard key={tenant.id} delay={index * 0.1}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Users className="h-8 w-8 text-emerald-600" />
                        <Badge className={getStatusColor(tenant.status)}>
                          {getStatusLabel(tenant.status)}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-emerald-600 transition-colors">
                        {tenant.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{tenant.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{applyPhoneMask(tenant.phone)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span>
                            {tenant.documentType === "cpf"
                              ? applyCpfMask(tenant.document)
                              : applyCnpjMask(tenant.document)}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleOpenDialog(tenant, true)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleOpenDialog(tenant, false)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              ))}
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isViewMode ? "Detalhes do Inquilino" : currentTenant ? "Editar Inquilino" : "Novo Inquilino"}
              </DialogTitle>
              <DialogDescription>
                {isViewMode
                  ? "Visualize as informações do inquilino"
                  : currentTenant
                  ? "Atualize as informações do inquilino"
                  : "Preencha os dados para cadastrar um novo inquilino"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="João da Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Telefone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={applyPhoneMask(formData.phone)}
                  onChange={(e) => setFormData({ ...formData, phone: removeMask(e.target.value) })}
                  maxLength={15}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentType">
                  Tipo de Documento <span className="text-red-500">*</span>
                </Label>
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
                  {formData.documentType === "cpf" ? "CPF" : "CNPJ"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="document"
                  placeholder={formData.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  value={formData.document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  maxLength={formData.documentType === "cpf" ? 14 : 18}
                  disabled={isViewMode}
                />
              </div>

              <DialogFooter className="gap-2">
                {isViewMode ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsViewMode(false)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    {currentTenant && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          handleDelete(currentTenant);
                          handleCloseDialog();
                        }}
                      >
                        Excluir
                      </Button>
                    )}
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      {currentTenant ? "Salvar Alterações" : "Cadastrar Inquilino"}
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