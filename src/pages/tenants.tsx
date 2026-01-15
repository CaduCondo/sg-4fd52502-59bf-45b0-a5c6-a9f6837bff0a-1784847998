import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { tenantService } from "@/services";
import { Tenant } from "@/types";
import { UserPlus, Mail, Phone, FileText, Trash2, Edit, X, Save } from "lucide-react";
import { SEO } from "@/components/SEO";
import { maskCPF, maskPhone, unformatCPF, unformatPhone, maskCNPJ } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";

export default function Tenants() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    rg: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setMounted(true);
    loadTenants();
  }, [router]);

  const loadTenants = async () => {
    try {
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os inquilinos",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cpf || !formData.email || !formData.phone) {
      toast({
        title: "Erro",
        description: "Todos os campos obrigatórios devem ser preenchidos",
        variant: "destructive",
      });
      return;
    }

    if (documentType === "cpf" && !formData.rg) {
      toast({
        title: "Erro",
        description: "RG é obrigatório para CPF",
        variant: "destructive",
      });
      return;
    }

    try {
      const tenantData: Omit<Tenant, "id" | "createdAt"> = {
        name: formData.name,
        cpf: unformatCPF(formData.cpf),
        rg: documentType === "cpf" ? formData.rg : "",
        documentType: documentType,
        email: formData.email,
        phone: unformatPhone(formData.phone),
        status: "active",
      };

      await tenantService.create(tenantData);
      
      toast({
        title: "Sucesso",
        description: "Inquilino cadastrado com sucesso",
      });

      setIsDialogOpen(false);
      resetForm();
      loadTenants();
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o inquilino",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedTenant) return;

    if (!formData.name || !formData.cpf || !formData.email || !formData.phone) {
      toast({
        title: "Erro",
        description: "Todos os campos obrigatórios devem ser preenchidos",
        variant: "destructive",
      });
      return;
    }

    if (documentType === "cpf" && !formData.rg) {
      toast({
        title: "Erro",
        description: "RG é obrigatório para CPF",
        variant: "destructive",
      });
      return;
    }

    try {
      const tenantData: Tenant = {
        ...selectedTenant,
        name: formData.name,
        cpf: unformatCPF(formData.cpf),
        rg: documentType === "cpf" ? formData.rg : "",
        documentType: documentType,
        email: formData.email,
        phone: unformatPhone(formData.phone),
        status: selectedTenant.status,
      };

      await tenantService.update(tenantData);
      
      toast({
        title: "Sucesso",
        description: "Inquilino atualizado com sucesso",
      });

      setIsEditing(false);
      setViewDialogOpen(false);
      setSelectedTenant(null);
      resetForm();
      loadTenants();
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o inquilino",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja excluir este inquilino?")) {
      return;
    }

    try {
      await tenantService.delete(id);
      
      toast({
        title: "Sucesso",
        description: "Inquilino excluído com sucesso",
      });

      loadTenants();
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o inquilino",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDocumentType(tenant.documentType as "cpf" | "cnpj");
    setFormData({
      name: tenant.name,
      cpf: tenant.documentType === "cpf" ? maskCPF(tenant.cpf) : maskCNPJ(tenant.cpf),
      rg: tenant.rg || "",
      email: tenant.email,
      phone: maskPhone(tenant.phone),
    });
    setIsEditing(false);
    setViewDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedTenant) {
      setFormData({
        name: selectedTenant.name,
        cpf: selectedTenant.documentType === "cpf" ? maskCPF(selectedTenant.cpf) : maskCNPJ(selectedTenant.cpf),
        rg: selectedTenant.rg || "",
        email: selectedTenant.email,
        phone: maskPhone(selectedTenant.phone),
      });
      setDocumentType(selectedTenant.documentType as "cpf" | "cnpj");
    }
    setIsEditing(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      rg: "",
      email: "",
      phone: "",
    });
    setDocumentType("cpf");
  };

  const handleDocumentTypeChange = (value: string) => {
    const newType = value as "cpf" | "cnpj";
    setDocumentType(newType);
    setFormData({ ...formData, cpf: "", rg: "" });
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <SEO 
        title="Inquilinos - ImóvelControl"
        description="Gerenciamento de inquilinos"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Inquilinos</h1>
              <p className="text-slate-600 mt-2">Gerencie os inquilinos cadastrados</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Novo Inquilino
            </Button>
          </div>

          {tenants.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserPlus className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 text-center">
                  Nenhum inquilino cadastrado ainda.
                  <br />
                  Clique em "Novo Inquilino" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <StaggerContainer staggerDelay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenants.map((tenant) => (
                  <StaggerItem key={tenant.id}>
                    <Card 
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer relative pb-12"
                      onClick={() => handleCardClick(tenant)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{tenant.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {tenant.documentType === "cpf" ? maskCPF(tenant.cpf) : maskCNPJ(tenant.cpf)}
                            </CardDescription>
                          </div>
                          <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                            {tenant.status === "active" ? "Ativo" : 
                             tenant.status === "rented" ? "Locador" : "Inativo"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-slate-600">
                            <Mail className="h-4 w-4 mr-2" />
                            {tenant.email}
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone className="h-4 w-4 mr-2" />
                            {maskPhone(tenant.phone)}
                          </div>
                          {tenant.documentType === "cpf" && tenant.rg && (
                            <div className="flex items-center text-sm text-slate-600">
                              <FileText className="h-4 w-4 mr-2" />
                              RG: {tenant.rg}
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <div className="absolute bottom-3 right-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(tenant.id, e)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          )}
        </div>

        {/* Dialog Novo Inquilino */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Inquilino</DialogTitle>
              <DialogDescription>
                Cadastre um novo inquilino no sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do inquilino"
                  />
                </div>

                <div>
                  <Label htmlFor="documentType">Tipo de Documento *</Label>
                  <Select value={documentType} onValueChange={handleDocumentTypeChange}>
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
                  <Label htmlFor="cpf">{documentType === "cpf" ? "CPF" : "CNPJ"} *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => {
                      const value = documentType === "cpf" 
                        ? maskCPF(e.target.value)
                        : maskCNPJ(e.target.value);
                      setFormData({ ...formData, cpf: value });
                    }}
                    placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  />
                </div>

                {documentType === "cpf" && (
                  <div>
                    <Label htmlFor="rg">RG *</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                      placeholder="Número do RG"
                    />
                  </div>
                )}

                <div>
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
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Visualizar/Editar Inquilino */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Inquilino" : "Detalhes do Inquilino"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize as informações do inquilino" : "Visualize as informações do inquilino"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="view-name">Nome Completo *</Label>
                <Input
                  id="view-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="view-documentType">Tipo de Documento *</Label>
                <Select value={documentType} onValueChange={handleDocumentTypeChange} disabled={!isEditing}>
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
                <Label htmlFor="view-cpf">{documentType === "cpf" ? "CPF" : "CNPJ"} *</Label>
                <Input
                  id="view-cpf"
                  value={formData.cpf}
                  onChange={(e) => {
                    const value = documentType === "cpf" 
                      ? maskCPF(e.target.value)
                      : maskCNPJ(e.target.value);
                    setFormData({ ...formData, cpf: value });
                  }}
                  disabled={!isEditing}
                />
              </div>

              {documentType === "cpf" && (
                <div>
                  <Label htmlFor="view-rg">RG *</Label>
                  <Input
                    id="view-rg"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="view-email">E-mail *</Label>
                <Input
                  id="view-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="view-phone">Telefone *</Label>
                <Input
                  id="view-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>

              {selectedTenant && (
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">
                    <Badge variant={selectedTenant.status === "active" ? "default" : "secondary"}>
                      {selectedTenant.status === "active" ? "Ativo" : 
                       selectedTenant.status === "rented" ? "Locador" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleUpdate}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Fechar
                  </Button>
                  <Button type="button" onClick={handleEditClick}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}