import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Search, Trash2, LayoutGrid, List } from "lucide-react";
import { Property, Location } from "@/types";
import { propertyService } from "@/services";
import { configService } from "@/services/configService";
import { getCurrentUser } from "@/lib/auth";
import { applyCepMask, applyRealMask, removeMask, formatCurrency } from "@/lib/masks";
import { isAuthenticatedAsync } from "@/lib/auth";

export default function PropertiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "occupied" | "unavailable">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    location: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    rentValue: "",
    description: "",
    status: "available",
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, statusFilter]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const config = await configService.get();
      setLocations(config.locations || []);
      
      const propertiesData = await propertyService.getAll();
      setProperties(propertiesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os imóveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = [...properties];

    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.complement.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((property) => property.status === statusFilter);
    }

    setFilteredProperties(filtered);
  };

  const handleCardClick = (propertyId: string) => {
    router.push(`/properties/${propertyId}`);
  };

  const openDialog = () => {
    if (locations.length === 0) {
      toast({
        title: "Atenção",
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
      neighborhood: "",
      city: "",
      state: "",
      rentValue: "",
      description: "",
      status: "available",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      location: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      rentValue: "",
      description: "",
      status: "available",
    });
  };

  const handleLocationChange = (value: string) => {
    const selectedLocation = locations.find(l => l.name === value);
    if (selectedLocation) {
      setFormData(prev => ({
        ...prev,
        location: selectedLocation.name,
        cep: selectedLocation.cep,
        address: selectedLocation.address,
        number: selectedLocation.number,
        neighborhood: selectedLocation.neighborhood,
        city: selectedLocation.city,
        state: selectedLocation.state
      }));
    } else {
      setFormData(prev => ({ ...prev, location: value }));
    }
  };

  const convertMaskedValueToNumber = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    const cleanValue = maskedValue.replace(/[^\d,]/g, "");
    const numericValue = cleanValue.replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location || !formData.complement || !formData.rentValue) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios: Local, Complemento e Valor do Aluguel.",
        variant: "destructive",
      });
      return;
    }

    try {
      const rentValueNumber = convertMaskedValueToNumber(formData.rentValue);

      const propertyData: Partial<Property> = {
        location: formData.location,
        cep: formData.cep || undefined,
        address: formData.address || undefined,
        number: formData.number || undefined,
        complement: formData.complement,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        monthlyRent: rentValueNumber,
        rentValue: rentValueNumber,
        type: "residential",
        status: formData.status as "available" | "occupied" | "unavailable",
        description: formData.description || undefined,
      };

      await propertyService.create(propertyData as Omit<Property, "id" | "createdAt">);
      toast({
        title: "Sucesso",
        description: "Imóvel cadastrado com sucesso!",
      });

      closeDialog();
      loadProperties();
    } catch (error) {
      console.error("Error saving property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, property: Property) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentUser = getCurrentUser();
    if (currentUser?.role === "broker" && property.status === "occupied") {
      toast({
        title: "Ação não permitida",
        description: "Corretores não podem deletar imóveis ocupados.",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await propertyService.delete(property.id);
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso!",
      });
      loadProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o imóvel.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-blue-500";
      case "unavailable":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponível";
      case "occupied":
        return "Alugado";
      case "unavailable":
        return "Indisponível";
      default:
        return status;
    }
  };

  return (
    <>
      <Head>
        <title>Imóveis - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Building2 className="h-8 w-8 text-emerald-600" />
                Imóveis
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie todos os imóveis cadastrados
              </p>
            </div>
            <Button onClick={openDialog} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por local, complemento, endereço ou cidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="occupied">Alugado</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando imóveis...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum imóvel encontrado</p>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece cadastrando seu primeiro imóvel"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={openDialog} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Primeiro Imóvel
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProperties.map((property) => (
                <Card
                  key={property.id}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => handleCardClick(property.id)}
                >
                  <CardContent className="p-3">
                    {/* Header: Ícone + Local + Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        <span className="font-bold text-lg text-gray-900 leading-none mt-1">
                          {property.location}
                        </span>
                      </div>
                      <Badge
                        variant={
                          property.status === "available"
                            ? "default"
                            : property.status === "occupied"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          property.status === "available"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : property.status === "occupied"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-amber-500 hover:bg-amber-600 text-white"
                        }
                      >
                        {property.status === "available"
                          ? "Disponível"
                          : property.status === "occupied"
                          ? "Alugado"
                          : "Indisponível"}
                      </Badge>
                    </div>

                    {/* Complemento em destaque */}
                    <div className="bg-black text-white px-3 py-1.5 rounded mb-2 inline-block">
                      <span className="font-medium text-sm">
                        {property.complement || "Sem complemento"}
                      </span>
                    </div>

                    {/* Footer: Valor + Botão Delete */}
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600 leading-tight">
                          {property.monthlyRent.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">por mês</p>
                      </div>
                      <button
                        onClick={(e) => {
                          handleDelete(e, property);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group/delete"
                      >
                        <Trash2 className="w-5 h-5 text-red-500 group-hover/delete:text-red-700" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProperties.map((property) => (
                <Card 
                  key={property.id}
                  className="hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleCardClick(property.id)}
                >
                  <CardContent className="py-2.5 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Building2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-base group-hover:text-emerald-600 transition-colors">
                            {property.location}
                          </h3>
                          <p className="text-sm text-muted-foreground">{property.complement}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(property.status)}>
                          {getStatusLabel(property.status)}
                        </Badge>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(property.rentValue)}
                          </p>
                          <p className="text-xs text-muted-foreground">por mês</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDelete(e, property)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Imóvel</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Local <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.location}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.name}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complement">
                    Complemento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="complement"
                    placeholder="Ex: Casa 2, Apto 101"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: applyCepMask(e.target.value) })}
                    maxLength={9}
                    disabled={!!locations.find(l => l.name === formData.location)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rentValue">
                    Valor do Aluguel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rentValue"
                    placeholder="R$ 0,00"
                    value={formData.rentValue}
                    onChange={(e) => setFormData({ ...formData, rentValue: applyRealMask(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, Avenida, etc."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!!locations.find(l => l.name === formData.location)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  placeholder="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  disabled={!!locations.find(l => l.name === formData.location)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    disabled={!!locations.find(l => l.name === formData.location)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!!locations.find(l => l.name === formData.location)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    placeholder="SP"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    disabled={!!locations.find(l => l.name === formData.location)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Informações adicionais sobre o imóvel..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Cadastrar Imóvel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}