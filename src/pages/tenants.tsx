import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Mail, Phone, FileText, User, X } from "lucide-react";
import { getAll as getAllTenants, create as createTenant, remove as deleteTenant } from "@/services/tenantService";
import { toast } from "@/hooks/use-toast";
import type { Tenant } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { applyPhoneMask, applyCpfMask } from "@/lib/masks";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
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
        tenant.cpf?.includes(term)
    );
    setFilteredTenants(filtered);
  }

  function handleInputChange(field: keyof Tenant, value: string) {
    let maskedValue = value;

    // Apply masks
    if (field === "phone") {
      maskedValue = applyPhoneMask(value);
    } else if (field === "cpf") {
      maskedValue = applyCpfMask(value);
    }

    setFormData((prev) => ({ ...prev, [field]: maskedValue }));
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

    try {
      console.log("📤 Creating tenant:", formData);
      await createTenant(formData as Omit<Tenant, "id" | "createdAt">);
      
      toast({
        title: "Inquilino cadastrado",
        description: "Inquilino cadastrado com sucesso!",
      });

      setIsDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
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

  function handleCardClick(tenantId: string) {
    router.push(`/tenants/${tenantId}`);
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "rented":
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Ativo
          </Badge>
        );
      case "inactive":
      case "unavailable":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Inativo
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  async function handleDelete(e: React.MouseEvent, tenantId: string) {
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja excluir este inquilino?")) return;
    
    try {
      await deleteTenant(tenantId);
      toast({
        title: "Inquilino excluído",
        description: "Inquilino excluído com sucesso!",
      });
      loadTenants();
    } catch (error) {
      console.error("❌ Error deleting tenant:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o inquilino.",
        variant: "destructive",
      });
    }
  }

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
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Inquilino
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou CPF..."
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
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Inquilino
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map((tenant, index) => (
                <ScrollReveal
                  key={tenant.id}
                  delay={index * 0.1}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-300 relative"
                    onClick={() => handleCardClick(tenant.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 z-10"
                      onClick={(e) => handleDelete(e, tenant.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <div className="flex items-start justify-between pr-8">
                        <div className="flex-1">
                          <CardTitle className="text-primary text-lg font-semibold">
                            {tenant.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {tenant.cpf || tenant.document || "CPF não informado"}
                          </CardDescription>
                        </div>
                        {getStatusBadge(tenant.status || "ativo")}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {tenant.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{tenant.email}</span>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}
                        {tenant.rg && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>RG: {tenant.rg}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Novo Inquilino</DialogTitle>
                <DialogDescription>
                  Cadastre um novo inquilino no sistema
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
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

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf || ""}
                    onChange={(e) => handleInputChange("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg || ""}
                    onChange={(e) => handleInputChange("rg", e.target.value)}
                    placeholder="00.000.000-0"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}