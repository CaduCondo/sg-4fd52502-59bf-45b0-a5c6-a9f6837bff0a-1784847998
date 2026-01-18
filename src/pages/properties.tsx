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
import { Building2, Plus, Search, Trash2, LayoutGrid, List, Edit, X } from "lucide-react";
import { Property, Location } from "@/types";
import { propertyService } from "@/services";
import { locationService } from "@/services/locationService";
import { getCurrentUser } from "@/lib/auth";
import { applyCepMask, applyRealMask, removeMask, formatCurrency } from "@/lib/masks";

export default function PropertiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "occupied" | "unavailable">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    locationId: "",
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
      const locationsData = await locationService.getAll();
      setLocations(locationsData);
      
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

  const handleCardClick = (property: Property) => {
    setSelectedProperty(property);
    setIsEditMode(false);
    setIsViewDialogOpen(true);
  };

  const openCreateDialog = () => {
    if (locations.length === 0) {
      toast({
        title: "Atenção",
        description: "Nenhum local cadastrado. Por favor, cadastre os locais nas configurações primeiro.",
        variant: "destructive",
      });
      return;
    }

    setFormData({
      locationId: "",
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
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setFormData({
      locationId: "",
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

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedProperty(null);
    setIsEditMode(false);
  };

  const handleEditClick = () => {
    if (!selectedProperty) return;

    const selectedLocation = locations.find(l => l.name === selectedProperty.location);

    setFormData({
      locationId: selectedLocation?.id || "",
      location: selectedProperty.location,
      cep: applyCepMask(selectedProperty.cep || ""),
      address: selectedProperty.address || "",
      number: selectedProperty.number || "",
      complement: selectedProperty.complement,
      neighborhood: selectedProperty.neighborhood || "",
      city: selectedProperty.city || "",
      state: selectedProperty.state || "",
      rentValue: applyRealMask(selectedProperty.monthlyRent.toString()),
      description: selectedProperty.description || "",
      status: selectedProperty.status,
    });
    setIsEditMode(true);
  };

  const handleLocationChange = (value: string) => {
    const selectedLocation = locations.find(l => l.id === value);
    if (selectedLocation) {
      setFormData(prev => ({
        ...prev,
        locationId: selectedLocation.id,
        location: selectedLocation.name,
        cep: applyCepMask(selectedLocation.zip_code || ""),
        address: selectedLocation.street || "",
        number: selectedLocation.number || "",
        neighborhood: selectedLocation.neighborhood || "",
        city: selectedLocation.city || "",
        state: selectedLocation.state || ""
      }));
    }
  };

  const convertMaskedValueToNumber = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    const cleanValue = maskedValue.replace(/[^\d,]/g, "");
    const numericValue = cleanValue.replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
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

      closeCreateDialog();
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

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProperty || !formData.location || !formData.complement || !formData.rentValue) {
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

      await propertyService.update(selectedProperty.id, propertyData);
      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });

      setIsEditMode(false);
      closeViewDialog();
      loadProperties();
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o imóvel.",
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
      closeViewDialog();
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
            <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
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
                  <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
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
                  onClick={() => handleCardClick(property)}
                >
                  <CardContent className="p-3">
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

                    <div className="mb-2">
                      <p className="text-sm text-foreground font-medium">
                        {property.complement || "Sem complemento"}
                      </p>
                    </div>

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
                  onClick={() => handleCardClick(property)}
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

        {/* Dialog de Criação */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Imóvel</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-location">
                    Local <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger id="create-location">
                      <SelectValue placeholder="Selecione um local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-complement">
                    Complemento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="create-complement"
                    placeholder="Ex: Casa 2, Apto 101"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-cep">CEP</Label>
                  <Input
                    id="create-cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: applyCepMask(e.target.value) })}
                    maxLength={9}
                    disabled={!!formData.locationId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-rentValue">
                    Valor do Aluguel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="create-rentValue"
                    placeholder="R$ 0,00"
                    value={formData.rentValue}
                    onChange={(e) => setFormData({ ...formData, rentValue: applyRealMask(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-address">Endereço</Label>
                <Input
                  id="create-address"
                  placeholder="Rua, Avenida, etc."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!!formData.locationId}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-number">Número</Label>
                  <Input
                    id="create-number"
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    disabled={!!formData.locationId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-neighborhood">Bairro</Label>
                  <Input
                    id="create-neighborhood"
                    placeholder="Bairro"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    disabled={!!formData.locationId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-city">Cidade</Label>
                  <Input
                    id="create-city"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!!formData.locationId}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-state">Estado</Label>
                <Input
                  id="create-state"
                  placeholder="SP"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  maxLength={2}
                  disabled={!!formData.locationId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">Descrição</Label>
                <Textarea
                  id="create-description"
                  placeholder="Informações adicionais sobre o imóvel..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="create-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeCreateDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Cadastrar Imóvel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Visualização/Edição */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {isEditMode ? "Editar Imóvel" : "Detalhes do Imóvel"}
                </DialogTitle>
                {!isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditClick}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>
            </DialogHeader>

            {!isEditMode && selectedProperty ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Building2 className="h-12 w-12 text-emerald-600" />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedProperty.location}</h2>
                    <p className="text-lg text-muted-foreground">{selectedProperty.complement}</p>
                  </div>
                  <Badge
                    className={`ml-auto ${getStatusColor(selectedProperty.status)}`}
                  >
                    {getStatusLabel(selectedProperty.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Valor do Aluguel</Label>
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedProperty.monthlyRent.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CEP</Label>
                    <p className="text-lg">{selectedProperty.cep || "—"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Endereço Completo</Label>
                    <p className="text-lg">
                      {selectedProperty.address || "—"}
                      {selectedProperty.number && `, ${selectedProperty.number}`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Bairro</Label>
                      <p className="text-lg">{selectedProperty.neighborhood || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Cidade/Estado</Label>
                      <p className="text-lg">
                        {selectedProperty.city || "—"}
                        {selectedProperty.state && ` - ${selectedProperty.state}`}
                      </p>
                    </div>
                  </div>

                  {selectedProperty.description && (
                    <div>
                      <Label className="text-muted-foreground">Descrição</Label>
                      <p className="text-base">{selectedProperty.description}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={(e) => handleDelete(e, selectedProperty)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Imóvel
                  </Button>
                  <Button variant="outline" onClick={closeViewDialog}>
                    Fechar
                  </Button>
                </DialogFooter>
              </div>
            ) : isEditMode && selectedProperty ? (
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">
                      Local <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={handleLocationChange}
                    >
                      <SelectTrigger id="edit-location">
                        <SelectValue placeholder="Selecione um local" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-complement">
                      Complemento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-complement"
                      placeholder="Ex: Casa 2, Apto 101"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cep">CEP</Label>
                    <Input
                      id="edit-cep"
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: applyCepMask(e.target.value) })}
                      maxLength={9}
                      disabled={!!formData.locationId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-rentValue">
                      Valor do Aluguel <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-rentValue"
                      placeholder="R$ 0,00"
                      value={formData.rentValue}
                      onChange={(e) => setFormData({ ...formData, rentValue: applyRealMask(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address">Endereço</Label>
                  <Input
                    id="edit-address"
                    placeholder="Rua, Avenida, etc."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!!formData.locationId}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-number">Número</Label>
                    <Input
                      id="edit-number"
                      placeholder="123"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      disabled={!!formData.locationId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input
                      id="edit-neighborhood"
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      disabled={!!formData.locationId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input
                      id="edit-city"
                      placeholder="São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!!formData.locationId}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input
                    id="edit-state"
                    placeholder="SP"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    disabled={!!formData.locationId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Informações adicionais sobre o imóvel..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Alugado</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}