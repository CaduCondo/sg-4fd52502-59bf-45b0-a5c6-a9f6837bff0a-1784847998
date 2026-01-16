import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, ArrowLeft, Edit, X } from "lucide-react";
import { Tenant } from "@/types";
import { tenantService } from "@/services";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, removeMask } from "@/lib/masks";

export default function TenantDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf" as "cpf" | "cnpj",
    document: "",
  });

  useEffect(() => {
    if (id) {
      loadTenant(id as string);
    }
  }, [id]);

  const loadTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      const tenantData = await tenantService.getById(tenantId);
      if (tenantData) {
        setTenant(tenantData);
        setFormData({
          name: tenantData.name,
          email: tenantData.email || "",
          phone: tenantData.phone || "",
          documentType: tenantData.documentType || "cpf",
          document: tenantData.document || "",
        });
      } else {
        toast({
          title: "Erro",
          description: "Inquilino não encontrado.",
          variant: "destructive",
        });
        router.push("/tenants");
      }
    } catch (error) {
      console.error("Error loading tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o inquilino.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        email: tenant.email || "",
        phone: tenant.phone || "",
        documentType: tenant.documentType || "cpf",
        document: tenant.document || "",
      });
    }
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!tenant) return;

    if (!formData.name) {
      toast({
        title: "Campo obrigatório",
        description: "O nome completo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "E-mail inválido",
          description: "Por favor, insira um e-mail válido.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const updatedTenant: Tenant = {
        ...tenant,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone ? removeMask(formData.phone) : undefined,
        documentType: formData.documentType,
        document: formData.document ? removeMask(formData.document) : undefined,
      };

      await tenantService.update(updatedTenant);
      toast({
        title: "Sucesso",
        description: "Inquilino atualizado com sucesso!",
      });
      setTenant(updatedTenant);
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o inquilino.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "rented":
        return "bg-blue-500";
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
      default:
        return status;
    }
  };

  const handleDocumentChange = (value: string) => {
    const masked = formData.documentType === "cpf" ? applyCpfMask(value) : applyCnpjMask(value);
    setFormData({ ...formData, document: masked });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!tenant) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Inquilino não encontrado</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Detalhes do Inquilino - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/tenants")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} className="bg-emerald-600 hover:bg-emerald-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-emerald-600" />
                  <div>
                    <CardTitle className="text-2xl">{tenant.name}</CardTitle>
                    {tenant.phone && (
                      <p className="text-muted-foreground">{applyPhoneMask(tenant.phone)}</p>
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(tenant.status)}>
                  {getStatusLabel(tenant.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                {isEditMode ? (
                  <Input
                    id="name"
                    placeholder="João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">{tenant.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                {isEditMode ? (
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">{tenant.email || "—"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                {isEditMode ? (
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={applyPhoneMask(formData.phone)}
                    onChange={(e) => setFormData({ ...formData, phone: removeMask(e.target.value) })}
                    maxLength={15}
                  />
                ) : (
                  <p className="text-lg font-medium">{tenant.phone ? applyPhoneMask(tenant.phone) : "—"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentType">Tipo de Documento</Label>
                {isEditMode ? (
                  <Select
                    value={formData.documentType}
                    onValueChange={(value: "cpf" | "cnpj") => {
                      setFormData({ ...formData, documentType: value, document: "" });
                    }}
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium">{tenant.documentType === "cpf" ? "CPF" : "CNPJ"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  {formData.documentType === "cpf" ? "CPF" : "CNPJ"}
                </Label>
                {isEditMode ? (
                  <Input
                    id="document"
                    placeholder={formData.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    value={formData.document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    maxLength={formData.documentType === "cpf" ? 14 : 18}
                  />
                ) : (
                  <p className="text-lg font-medium">{tenant.document || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}