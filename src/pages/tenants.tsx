import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Mail, Phone, FileText, User, Trash2, Edit, AlertCircle } from "lucide-react";
import { getAll as getAllTenants, create as createTenant, update as updateTenant, remove as deleteTenant } from "@/services/tenantService";
import { toast } from "@/hooks/use-toast";
import type { Tenant } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { applyPhoneMask, applyCpfMask, applyCnpjMask, applyRgMask } from "@/lib/masks";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // Delete states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf",
    document: "",
    cpf: "",
    rg: "",
  });

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [searchTerm, tenants]);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const data = await getAllTenants();
      setTenants(data);
    } catch (error) {
      console.error("❌ Error loading tenants:", error);
      toast({
        title: "Erro ao carregar inquilinos",
        description: "Não foi possível carregar a lista de inquilinos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  function filterTenants() {
    if (!searchTerm.trim()) {
      setFilteredTenants(tenants);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = tenants.filter(
      (tenant) =>
        tenant.name?.toLowerCase().includes(term) ||
        tenant.email?.toLowerCase().includes(term) ||
        tenant.phone?.includes(term) ||
        tenant.document?.includes(term) ||
        tenant.cpf?.includes(term)
    );
    setFilteredTenants(filtered);
  }

  function handleInputChange(field: keyof Tenant, value: string) {
    let maskedValue = value;

    if (field === "phone") {
      maskedValue = applyPhoneMask(value);
    } else if (field === "document") {
      if (formData.documentType === "cpf") {
        maskedValue = applyCpfMask(value);
      } else {
        maskedValue = applyCnpjMask(value);
      }
    } else if (field === "rg") {
      maskedValue = applyRgMask(value);
    }

    setFormData((prev) => ({ ...prev, [field]: maskedValue }));
  }

  function handleDocumentTypeChange(type: "cpf" | "cnpj") {
    setFormData((prev) => ({
      ...prev,
      documentType: type,
      document: "",
      cpf: type === "cpf" ? "" : prev.cpf,
      rg: type === "cpf" ? "" : "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do inquilino.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.document?.trim()) {
      toast({
        title: "Documento obrigatório",
        description: `Por favor, informe o ${formData.documentType === "cpf" ? "CPF" : "CNPJ"}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("📤 Creating tenant:", formData);
      
      const tenantData: any = {
        name: formData.name,
        email: formData.email || "",
        phone: formData.phone || "",
        document_type: formData.documentType,
        document: formData.document,
        status: "active",
      };

      if (formData.documentType === "cpf") {
        tenantData.cpf = formData.document;
        if (formData.rg) {
          tenantData.rg = formData.rg;
        }
      }

      await createTenant(tenantData);
      
      toast({
        title: "Inquilino cadastrado",
        description: "Inquilino cadastrado com sucesso!",
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        documentType: "cpf",
        document: "",
        cpf: "",
        rg: "",
      });
      loadTenants();
    } catch (error) {
      console.error("❌ Error creating tenant:", error);
      toast({
        title: "Erro ao cadastrar",
        description: "Não foi possível cadastrar o inquilino.",
        variant: "destructive",
      });
    }
  }

  function handleCardClick(tenant: Tenant) {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email || "",
      phone: tenant.phone || "",
      documentType: tenant.document_type as "cpf" | "cnpj" || "cpf",
      document: tenant.document || tenant.cpf || "",
      cpf: tenant.cpf || "",
      rg: tenant.rg || "",
    });
    setIsEditMode(false);
    setIsDetailsDialogOpen(true);
  }

  function handleEdit() {
    setIsEditMode(true);
  }

  function handleCancelEdit() {
    if (selectedTenant) {
      setFormData({
        name: selectedTenant.name,
        email: selectedTenant.email || "",
        phone: selectedTenant.phone || "",
        documentType: selectedTenant.document_type as "cpf" | "cnpj" || "cpf",
        document: selectedTenant.document || selectedTenant.cpf || "",
        cpf: selectedTenant.cpf || "",
        rg: selectedTenant.rg || "",
      });
    }
    setIsEditMode(false);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTenant) return;

    if (!formData.name?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do inquilino.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.document?.trim()) {
      toast({
        title: "Documento obrigatório",
        description: `Por favor, informe o ${formData.documentType === "cpf" ? "CPF" : "CNPJ"}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const tenantData: any = {
        name: formData.name,
        email: formData.email || "",
        phone: formData.phone || "",
        document_type: formData.documentType,
        document: formData.document,
        status: selectedTenant.status || "active",
      };

      if (formData.documentType === "cpf") {
        tenantData.cpf = formData.document;
        if (formData.rg) {
          tenantData.rg = formData.rg;
        }
      }

      await updateTenant(selectedTenant.id, tenantData);
      
      toast({
        title: "Inquilino atualizado",
        description: "Dados atualizados com sucesso!",
      });

      setIsEditMode(false);
      loadTenants();
      
      // Update selected tenant
      const updatedTenant = { ...selectedTenant, ...tenantData };
      setSelectedTenant(updatedTenant);
    } catch (error) {
      console.error("❌ Error updating tenant:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    }
  }

  const confirmDelete = (e: React.MouseEvent, tenantId: string) => {
    e.stopPropagation();
    setTenantToDelete(tenantId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteFromDetails = () => {
    if (selectedTenant) {
      setTenantToDelete(selectedTenant.id);
      setIsDetailsDialogOpen(false);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return;
    
    try {
      await deleteTenant(tenantToDelete);
      toast({
        title: "Inquilino excluído",
        description: "Inquilino excluído com sucesso!",
      });
      setIsDeleteDialogOpen(false);
      setTenantToDelete(null);
      setIsDetailsDialogOpen(false);
      loadTenants();
    } catch (error) {
      console.error("❌ Error deleting tenant:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o inquilino.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || "active";
    
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      ativo: "default",
      rented: "default",
      inactive: "secondary",
      inativo: "secondary",
      unavailable: "destructive",
    };
    
    const labels: Record<string, string> = {
      active: "Ativo",
      ativo: "Ativo",
      rented: "Ativo",
      inactive: "Inativo",
      inativo: "Inativo",
      unavailable: "Indisponível",
    };
    
    return (
      <Badge variant={variants[normalizedStatus] || "default"}>
        {labels[normalizedStatus] || status}
      </Badge>
    );
  };

  return (
    <>
      <SEO
        title="Inquilinos - Gerenciador de Locações"
        description="Gerencie seus inquilinos"
      />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie os inquilinos dos seus imóveis
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Inquilino
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {searchTerm
                    ? "Nenhum inquilino encontrado"
                    : "Nenhum inquilino cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Comece cadastrando seu primeiro inquilino"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Inquilino
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map((tenant, index) => (
                <ScrollReveal key={tenant.id} delay={index * 0.1}>
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-300"
                    onClick={() => handleCardClick(tenant)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold text-blue-600">
                            {tenant.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <FileText className="h-3 w-3" />
                            {tenant.document || tenant.cpf || "Documento não informado"}
                          </CardDescription>
                        </div>
                        {getStatusBadge(tenant.status || "ativo")}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="space-y-1.5">
                        {tenant.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{tenant.email}</span>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end pt-3 mt-2 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => confirmDelete(e, tenant.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Novo Inquilino</DialogTitle>
                <DialogDescription>
                  Cadastre um novo inquilino no sistema
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="João da Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="joao@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">
                      Tipo de Documento <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.documentType}
                      onValueChange={(value: "cpf" | "cnpj") => handleDocumentTypeChange(value)}
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
                      {formData.documentType === "cpf" ? "CPF" : "CNPJ"}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="document"
                      value={formData.document || ""}
                      onChange={(e) => handleInputChange("document", e.target.value)}
                      placeholder={
                        formData.documentType === "cpf"
                          ? "000.000.000-00"
                          : "00.000.000/0000-00"
                      }
                      required
                    />
                  </div>
                </div>

                {formData.documentType === "cpf" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        value={formData.rg || ""}
                        onChange={(e) => handleInputChange("rg", e.target.value)}
                        placeholder="00.000.000-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                )}

                {formData.documentType === "cnpj" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Details/Edit Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            {!isEditMode ? (
              // View Mode
              <>
                <DialogHeader>
                  <DialogTitle>Detalhes do Inquilino</DialogTitle>
                  <DialogDescription>
                    Informações do inquilino cadastrado
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Nome completo</Label>
                      <p className="text-sm font-medium">{formData.name}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-sm font-medium">{formData.email || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Tipo de Documento</Label>
                      <p className="text-sm font-medium">{formData.documentType === "cpf" ? "CPF" : "CNPJ"}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{formData.documentType === "cpf" ? "CPF" : "CNPJ"}</Label>
                      <p className="text-sm font-medium">{formData.document}</p>
                    </div>
                  </div>

                  {formData.documentType === "cpf" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">RG</Label>
                        <p className="text-sm font-medium">{formData.rg || "Não informado"}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Telefone</Label>
                        <p className="text-sm font-medium">{formData.phone || "Não informado"}</p>
                      </div>
                    </div>
                  )}

                  {formData.documentType === "cnpj" && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Telefone</Label>
                      <p className="text-sm font-medium">{formData.phone || "Não informado"}</p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDetailsDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmDeleteFromDetails}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                  <Button type="button" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </DialogFooter>
              </>
            ) : (
              // Edit Mode
              <form onSubmit={handleSaveEdit}>
                <DialogHeader>
                  <DialogTitle>Editar Inquilino</DialogTitle>
                  <DialogDescription>
                    Altere as informações do inquilino
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">
                        Nome completo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="edit-name"
                        value={formData.name || ""}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="João da Silva"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="joao@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-documentType">
                        Tipo de Documento <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.documentType}
                        onValueChange={(value: "cpf" | "cnpj") => handleDocumentTypeChange(value)}
                      >
                        <SelectTrigger id="edit-documentType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-document">
                        {formData.documentType === "cpf" ? "CPF" : "CNPJ"}{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="edit-document"
                        value={formData.document || ""}
                        onChange={(e) => handleInputChange("document", e.target.value)}
                        placeholder={
                          formData.documentType === "cpf"
                            ? "000.000.000-00"
                            : "00.000.000/0000-00"
                        }
                        required
                      />
                    </div>
                  </div>

                  {formData.documentType === "cpf" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-rg">RG</Label>
                        <Input
                          id="edit-rg"
                          value={formData.rg || ""}
                          onChange={(e) => handleInputChange("rg", e.target.value)}
                          placeholder="00.000.000-0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Telefone</Label>
                        <Input
                          id="edit-phone"
                          value={formData.phone || ""}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>
                  )}

                  {formData.documentType === "cnpj" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Telefone</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este inquilino? Esta ação não pode ser desfeita e removerá todos os dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTenantToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}