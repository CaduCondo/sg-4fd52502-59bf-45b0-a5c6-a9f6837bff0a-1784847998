import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency, applyCepMask, unformatCep } from "@/lib/masks";
import { Building2, MapPin, DollarSign, Trash2, Edit, X } from "lucide-react";
import { propertyService } from "@/services";
import { configService } from "@/services/configService";
import type { Property, Config } from "@/types";

export default function Properties() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [formData, setFormData] = useState({
    location: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    city: "",
    state: "",
    monthlyRent: "",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesData, configData] = await Promise.all([
        propertyService.getAll(),
        configService.get(),
      ]);
      setProperties(propertiesData);
      setConfig(configData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    if (!config || !config.locations || config.locations.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum local cadastrado. Por favor, cadastre os locais nas configurações primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    setFormData({
      location: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      city: "",
      state: "",
      monthlyRent: "",
      description: "",
    });
    setSelectedProperty(null);
    setIsEditing(false);
    setViewMode(false);
    setIsDialogOpen(true);
  };

  const handleCardClick = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      location: property.location,
      cep: property.zipCode ? applyCepMask(property.zipCode) : "",
      address: property.address || "",
      number: property.number || "",
      complement: property.complement || "",
      city: property.city || "",
      state: property.state || "",
      monthlyRent: formatCurrency(property.monthlyRent.toString()),
      description: property.description || "",
    });
    setIsEditing(false);
    setViewMode(true);
    setIsDialogOpen(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedProperty) {
      setFormData({
        location: selectedProperty.location,
        cep: selectedProperty.zipCode ? applyCepMask(selectedProperty.zipCode) : "",
        address: selectedProperty.address || "",
        number: selectedProperty.number || "",
        complement: selectedProperty.complement || "",
        city: selectedProperty.city || "",
        state: selectedProperty.state || "",
        monthlyRent: formatCurrency(selectedProperty.monthlyRent.toString()),
        description: selectedProperty.description || "",
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location || !formData.complement || !formData.monthlyRent) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const propertyData: Omit<Property, "id" | "createdAt"> = {
        location: formData.location,
        zipCode: unformatCep(formData.cep),
        address: formData.address,
        number: formData.number,
        complement: formData.complement,
        city: formData.city,
        state: formData.state,
        monthlyRent: parseCurrency(formData.monthlyRent),
        type: "house",
        status: "available",
        description: formData.description,
      };

      if (selectedProperty) {
        await propertyService.update({
          ...propertyData,
          id: selectedProperty.id,
          createdAt: selectedProperty.createdAt,
        });
        toast({
          title: "Sucesso",
          description: "Imóvel atualizado com sucesso",
        });
      } else {
        await propertyService.create(propertyData);
        toast({
          title: "Sucesso",
          description: "Imóvel cadastrado com sucesso",
        });
      }

      setIsDialogOpen(false);
      setViewMode(false);
      setIsEditing(false);
      loadData();
    } catch (error) {
      console.error("Error saving property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o imóvel",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await propertyService.delete(id);
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o imóvel",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "available") {
      return <Badge variant="success">Vago</Badge>;
    }
    return <Badge variant="secondary">Ocupado</Badge>;
  };

  const isFormDisabled = viewMode && !isEditing;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <SEO
        title="Imóveis - Gerenciador de Locações"
        description="Gerencie seus imóveis cadastrados"
      />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
              <p className="text-slate-600 mt-1">
                Gerencie seus imóveis cadastrados
              </p>
            </div>
            <Button onClick={handleOpenDialog}>
              <Building2 className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Carregando imóveis...</p>
            </div>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 mb-4">
                  Nenhum imóvel cadastrado ainda.
                </p>
                <Button onClick={handleOpenDialog}>Cadastrar Primeiro Imóvel</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <Card
                  key={property.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer relative pb-16"
                >
                  <div onClick={() => handleCardClick(property)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                            {property.location}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {property.complement}
                          </CardDescription>
                        </div>
                        {getStatusBadge(property.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {property.address && (
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {property.address}
                              {property.number && `, ${property.number}`}
                            </span>
                          </div>
                        )}
                        {property.city && property.state && (
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{property.city} - {property.state}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm font-semibold text-emerald-600">
                          <DollarSign className="mr-2 h-4 w-4" />
                          {formatCurrency(property.monthlyRent.toString())}/mês
                        </div>
                      </div>
                    </CardContent>
                  </div>
                  <CardFooter className="absolute bottom-0 right-0 p-4">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => handleDelete(property.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewMode
                  ? isEditing
                    ? "Editar Imóvel"
                    : "Detalhes do Imóvel"
                  : "Novo Imóvel"}
              </DialogTitle>
              <DialogDescription>
                {viewMode
                  ? isEditing
                    ? "Atualize as informações do imóvel"
                    : "Visualize as informações do imóvel"
                  : "Preencha as informações do novo imóvel"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Local *</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) =>
                      setFormData({ ...formData, location: value })
                    }
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {config?.locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cep: applyCepMask(e.target.value),
                      })
                    }
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, Avenida..."
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    disabled={isFormDisabled}
                  />
                </div>

                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({ ...formData, number: e.target.value })
                    }
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complement">Complemento *</Label>
                <Input
                  id="complement"
                  placeholder="Casa 2, Apto 101..."
                  value={formData.complement}
                  onChange={(e) =>
                    setFormData({ ...formData, complement: e.target.value })
                  }
                  disabled={isFormDisabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    disabled={isFormDisabled}
                  />
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    placeholder="SP"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        state: e.target.value.toUpperCase(),
                      })
                    }
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="monthlyRent">Valor do Aluguel *</Label>
                <Input
                  id="monthlyRent"
                  placeholder="R$ 0,00"
                  value={formData.monthlyRent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyRent: formatCurrency(e.target.value),
                    })
                  }
                  disabled={isFormDisabled}
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Informações adicionais sobre o imóvel..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={isFormDisabled}
                />
              </div>

              <DialogFooter>
                {viewMode ? (
                  isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button type="submit">Salvar</Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Fechar
                      </Button>
                      <Button type="button" onClick={handleEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Cadastrar</Button>
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