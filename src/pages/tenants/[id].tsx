import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, ArrowLeft, Edit, X, Trash2 } from "lucide-react";
import { Tenant } from "@/types";
import { getById as getTenantById, update as updateTenant, remove as deleteTenant } from "@/services/tenantService";
import { applyCpfMask, applyPhoneMask, removeMask } from "@/lib/masks";

export default function TenantDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });

  useEffect(() => {
    if (id) {
      loadTenant(id as string);
    }
  }, [id]);

  const loadTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      const tenantData = await getTenantById(tenantId);
      if (tenantData) {
        setTenant(tenantData);
        setFormData({
          name: tenantData.name,
          email: tenantData.email || "",
          phone: tenantData.phone || "",
          cpf: tenantData.cpf || "",
        });
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
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        email: tenant.email || "",
        phone: tenant.phone || "",
        cpf: tenant.cpf || "",
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateTenant(id as string, formData);
      toast({
        title: "Sucesso",
        description: "Inquilino atualizado com sucesso.",
      });
      setIsEditing(false);
      loadTenant(id as string);
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
      await deleteTenant(id as string);
      toast({
        title: "Sucesso",
        description: "Inquilino excluído com sucesso.",
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
      <SEO title="Detalhes do Inquilino - Gerenciador de Locações" />
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
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
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
                  <Users className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                </div>
                {getStatusBadge(tenant.status || "active")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                  {isEditing ? (
                    <Input
                      placeholder="João da Silva"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium">{tenant.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      placeholder="joao@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium">{tenant.email || "—"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CPF</Label>
                  {isEditing ? (
                    <Input
                      placeholder="000.000.000-00"
                      value={applyCpfMask(formData.cpf)}
                      onChange={(e) => setFormData({ ...formData, cpf: removeMask(e.target.value) })}
                      maxLength={14}
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium">{tenant.cpf ? applyCpfMask(tenant.cpf) : "—"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  {isEditing ? (
                    <Input
                      placeholder="(00) 00000-0000"
                      value={applyPhoneMask(formData.phone)}
                      onChange={(e) => setFormData({ ...formData, phone: removeMask(e.target.value) })}
                      maxLength={15}
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium">{tenant.phone ? applyPhoneMask(tenant.phone) : "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}