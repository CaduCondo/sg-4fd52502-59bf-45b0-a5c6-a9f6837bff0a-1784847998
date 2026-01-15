import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { tenantService } from "@/services";
import type { Tenant } from "@/types";
import { Plus, Eye, Pencil, Trash2, User, Mail, Phone, Calendar } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCPF, formatPhone, unformatCPF, unformatPhone, formatCNPJ, unformatCNPJ } from "@/lib/masks";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    rg: "",
    email: "",
    phone: "",
    status: "active" as "active" | "inactive",
  });
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar inquilinos",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      rg: "",
      email: "",
      phone: "",
      status: "active",
    });
    setDocumentType("cpf");
    setSelectedTenant(null);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.cpf || !formData.email || !formData.phone) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }

      // Validate RG is required for CPF
      if (documentType === "cpf" && !formData.rg) {
        toast({
          title: "Erro",
          description: "RG é obrigatório para CPF",
          variant: "destructive",
        });
        return;
      }

      const tenantData = {
        name: formData.name,
        cpf: unformatCPF(formData.cpf),
        rg: documentType === "cpf" ? formData.rg : "",
        documentType: documentType,
        email: formData.email,
        phone: unformatPhone(formData.phone),
        status: formData.status,
      };

      if (isEditMode && selectedTenant) {
        await tenantService.update({
          ...tenantData,
          id: selectedTenant.id,
          createdAt: selectedTenant.createdAt,
        });
        toast({
          title: "Sucesso",
          description: "Inquilino atualizado com sucesso",
        });
      } else {
        await tenantService.create(tenantData);
        toast({
          title: "Sucesso",
          description: "Inquilino cadastrado com sucesso",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadTenants();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar inquilino",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    const docType = tenant.documentType || "cpf";
    setDocumentType(docType);
    setFormData({
      name: tenant.name,
      cpf: docType === "cpf" ? formatCPF(tenant.cpf) : formatCNPJ(tenant.cpf),
      rg: tenant.rg || "",
      email: tenant.email,
      phone: formatPhone(tenant.phone),
      status: tenant.status,
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleView = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;

    try {
      await tenantService.delete(tenantToDelete.id);
      toast({
        title: "Sucesso",
        description: "Inquilino excluído com sucesso",
      });
      setIsDeleteDialogOpen(false);
      setTenantToDelete(null);
      loadTenants();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir inquilino",
        variant: "destructive",
      });
    }
  };

  const handleDocumentChange = (value: string) => {
    const formatted = documentType === "cpf" ? formatCPF(value) : formatCNPJ(value);
    setFormData({ ...formData, cpf: formatted });
  };

  const filteredTenants = tenants.filter((tenant) => {
    if (activeTab === "active") return tenant.status === "active";
    if (activeTab === "inactive") return tenant.status === "inactive";
    return true;
  });

  return (
    <Layout>
      <SEO 
        title="Inquilinos - Gerenciador de Locações"
        description="Gerencie seus inquilinos e contratos de locação"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Inquilinos</h1>
            <p className="text-muted-foreground">Gerencie seus inquilinos</p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Inquilino
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todos ({tenants.length})</TabsTrigger>
            <TabsTrigger value="active">Ativos ({tenants.filter(t => t.status === "active").length})</TabsTrigger>
            <TabsTrigger value="inactive">Inativos ({tenants.filter(t => t.status === "inactive").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredTenants.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum inquilino encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTenants.map((tenant) => (
                  <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                          {tenant.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span className="text-xs">{tenant.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span className="text-xs">{formatPhone(tenant.phone)}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleView(tenant)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(tenant)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          setTenantToDelete(tenant);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New/Edit Tenant Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Inquilino" : "Novo Inquilino"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Atualize as informações do inquilino" : "Cadastre um novo inquilino"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <Label htmlFor="documentType">Tipo de Documento *</Label>
                <Select
                  value={documentType}
                  onValueChange={(value: "cpf" | "cnpj") => {
                    setDocumentType(value);
                    setFormData({ ...formData, cpf: "", rg: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                    <SelectItem value="cnpj">CNPJ (Pessoa Jurídica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cpf">{documentType === "cpf" ? "CPF *" : "CNPJ *"}</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  maxLength={documentType === "cpf" ? 14 : 18}
                />
              </div>

              {documentType === "cpf" && (
                <div className="md:col-span-2">
                  <Label htmlFor="rg">RG *</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="Ex: 12.345.678-9"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {isEditMode ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Tenant Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Inquilino</DialogTitle>
            </DialogHeader>
            {selectedTenant && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedTenant.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    {selectedTenant.documentType === "cnpj" ? "CNPJ" : "CPF"}
                  </Label>
                  <p className="font-medium">
                    {selectedTenant.documentType === "cnpj" 
                      ? formatCNPJ(selectedTenant.cpf)
                      : formatCPF(selectedTenant.cpf)
                    }
                  </p>
                </div>
                {selectedTenant.documentType === "cpf" && selectedTenant.rg && (
                  <div>
                    <Label className="text-muted-foreground">RG</Label>
                    <p className="font-medium">{selectedTenant.rg}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">E-mail</Label>
                  <p className="font-medium">{selectedTenant.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{formatPhone(selectedTenant.phone)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedTenant.status === "active" ? "default" : "secondary"}>
                      {selectedTenant.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Cadastro</Label>
                  <p className="font-medium">
                    {new Date(selectedTenant.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o inquilino <strong>{tenantToDelete?.name}</strong>?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}