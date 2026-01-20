import { useState, useEffect } from "react";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Users, X, Save, FileText, Mail, Phone } from "lucide-react";
import { getById, update, remove } from "@/services/tenantService";
import { toast } from "@/hooks/use-toast";
import type { Tenant } from "@/types";
import { applyPhoneMask, applyCpfMask, applyCnpjMask, applyRgMask } from "@/lib/masks";

export default function TenantDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({});

  useEffect(() => {
    if (id) {
      loadTenant();
    }
  }, [id]);

  const loadTenant = async () => {
    try {
      setLoading(true);
      const data = await getById(id as string);
      setTenant(data);
      // Initialize form data
      setFormData({
        name: data.name,
        email: data.email,
        phone: data.phone,
        documentType: data.documentType || "cpf",
        document: data.document || data.cpf || "", // Fallback to cpf if document is empty
        cpf: data.cpf,
        rg: data.rg,
        status: data.status,
      });
    } catch (error) {
      console.error("Error loading tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do inquilino.",
        variant: "destructive",
      });
      router.push("/tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (tenant) {
      setFormData({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        documentType: tenant.documentType || "cpf",
        document: tenant.document || tenant.cpf || "",
        cpf: tenant.cpf,
        rg: tenant.rg,
        status: tenant.status,
      });
    }
  };

  const handleInputChange = (field: keyof Tenant, value: string) => {
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
  };

  const handleDocumentTypeChange = (type: "cpf" | "cnpj") => {
    setFormData((prev) => ({
      ...prev,
      documentType: type,
      document: "", // Clear document when type changes
      rg: type === "cpf" ? prev.rg : "", // Keep RG if switching to CPF (or clear if switching to CNPJ)
    }));
  };

  const handleSave = async () => {
    if (!tenant) return;

    if (!formData.name?.trim()) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.document?.trim()) {
      toast({
         title: "Erro",
         description: "O documento é obrigatório.",
         variant: "destructive",
      });
      return;
    }

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        document_type: formData.documentType,
        document: formData.document,
        status: formData.status,
      };

      if (formData.documentType === "cpf") {
         updateData.cpf = formData.document;
         updateData.rg = formData.rg;
      } else {
         updateData.cpf = null; // Clear CPF field if it's CNPJ
         updateData.rg = null;  // Clear RG field if it's CNPJ
      }

      await update(tenant.id, updateData);
      
      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso!",
      });
      
      setIsEditing(false);
      loadTenant();
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o inquilino.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este inquilino?")) return;

    try {
      await remove(tenant!.id);
      toast({
        title: "Sucesso",
        description: "Inquilino excluído com sucesso!",
      });
      router.push("/tenants");
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o inquilino.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || "active";
    
    if (normalizedStatus === "active" || normalizedStatus === "ativo" || normalizedStatus === "rented") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Ativo
        </Badge>
      );
    }
    
    if (normalizedStatus === "inactive" || normalizedStatus === "inativo" || normalizedStatus === "unavailable") {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Inativo
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!tenant) return null;

  return (
    <>
      <SEO title={`Inquilino: ${tenant.name}`} />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push("/tenants")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{formData.name}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                       <FileText className="h-3 w-3" />
                       {formData.document || "Documento não informado"}
                    </div>
                  </div>
                </div>
                {getStatusBadge(formData.status || "active")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={!isEditing}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.email || ""}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={!isEditing}
                      className="pl-9 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value: "cpf" | "cnpj") => handleDocumentTypeChange(value)}
                    disabled={!isEditing}
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

                <div className="space-y-2">
                  <Label>{formData.documentType === "cpf" ? "CPF" : "CNPJ"}</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.document || ""}
                      onChange={(e) => handleInputChange("document", e.target.value)}
                      disabled={!isEditing}
                      className="pl-9 bg-background"
                      placeholder={formData.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    />
                  </div>
                </div>

                {formData.documentType === "cpf" && (
                  <div className="space-y-2">
                    <Label>RG</Label>
                    <Input
                      value={formData.rg || ""}
                      onChange={(e) => handleInputChange("rg", e.target.value)}
                      disabled={!isEditing}
                      className="bg-background"
                      placeholder="00.000.000-0"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.phone || ""}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      disabled={!isEditing}
                      className="pl-9 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                    disabled={!isEditing}
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
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}