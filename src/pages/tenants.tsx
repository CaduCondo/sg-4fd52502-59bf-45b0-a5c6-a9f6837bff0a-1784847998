"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, FileText, Trash2, X, Edit2, Save } from "lucide-react";
import { tenantService } from "@/services";
import { Tenant } from "@/types";
import { applyCpfMask, applyCnpjMask, applyPhoneMask } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    documentType: "cpf",
    status: "active"
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
      return;
    }
    loadTenants();
  }, [router]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (error) {
      console.error("Erro ao carregar inquilinos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tenant?: Tenant) => {
    if (tenant) {
      setFormData(tenant);
      setViewMode(true);
      setEditMode(false);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        documentType: "cpf",
        status: "active"
      });
      setViewMode(false);
      setEditMode(false);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setViewMode(false);
    setEditMode(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      cpf: "",
      documentType: "cpf",
      status: "active"
    });
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    const originalTenant = tenants.find(t => t.id === formData.id);
    if (originalTenant) {
      setFormData(originalTenant);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email || !formData.phone || !formData.cpf) {
        alert("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      if (formData.id) {
        await tenantService.update(formData as Tenant);
      } else {
        await tenantService.create(formData as Omit<Tenant, "id" | "createdAt">);
      }

      await loadTenants();
      handleCloseDialog();
    } catch (error) {
      console.error("Erro ao salvar inquilino:", error);
      alert("Erro ao salvar inquilino. Tente novamente.");
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este inquilino?")) {
      try {
        await tenantService.delete(id);
        await loadTenants();
      } catch (error) {
        console.error("Erro ao excluir inquilino:", error);
        alert("Erro ao excluir inquilino. Tente novamente.");
      }
    }
  };

  const handleDocumentChange = (value: string) => {
    let maskedValue = value;
    if (formData.documentType === "cpf") {
      maskedValue = applyCpfMask(value);
    } else {
      maskedValue = applyCnpjMask(value);
    }
    setFormData({ ...formData, cpf: maskedValue });
  };

  const handlePhoneChange = (value: string) => {
    const maskedValue = applyPhoneMask(value);
    setFormData({ ...formData, phone: maskedValue });
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

  const isFormDisabled = viewMode && !editMode;

  return (
    <>
      <SEO
        title="Inquilinos - Gerenciador de Locações"
        description="Gerencie seus inquilinos"
      />
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inquilinos</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie seus inquilinos cadastrados
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <User className="mr-2 h-4 w-4" />
              Novo Inquilino
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Carregando inquilinos...</p>
            </div>
          ) : tenants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Nenhum inquilino cadastrado
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Comece adicionando um novo inquilino ao sistema.
                </p>
              </CardContent>
            </Card>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenants.map((tenant) => (
                <StaggerItem key={tenant.id}>
                  <Card 
                    className="hover:shadow-lg transition-all cursor-pointer relative pb-12"
                    onClick={() => handleOpenDialog(tenant)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        <Badge className={getStatusColor(tenant.status)}>
                          {getStatusLabel(tenant.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="mr-2 h-4 w-4" />
                        {tenant.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="mr-2 h-4 w-4" />
                        {tenant.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FileText className="mr-2 h-4 w-4" />
                        {tenant.documentType.toUpperCase()}: {tenant.cpf}
                      </div>
                    </CardContent>
                    <CardFooter className="absolute bottom-0 right-0 p-4">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={(e) => handleDelete(tenant.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewMode ? "Detalhes do Inquilino" : "Novo Inquilino"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do inquilino"
                    disabled={isFormDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    disabled={isFormDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo de Documento *</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => 
                      setFormData({ ...formData, documentType: value as "cpf" | "cnpj", cpf: "" })
                    }
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">
                  {formData.documentType === "cpf" ? "CPF" : "CNPJ"} *
                </Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder={formData.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <DialogFooter>
              {viewMode && !editMode ? (
                <>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    <X className="mr-2 h-4 w-4" />
                    Fechar
                  </Button>
                  <Button onClick={handleEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </>
              ) : viewMode && editMode ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}