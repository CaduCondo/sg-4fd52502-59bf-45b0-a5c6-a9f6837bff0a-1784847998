import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { propertyService } from "@/services/propertyService";
import { getAll as getAllLocations } from "@/services/locationService";
import { getAll as getUserLocationPermissions } from "@/services/userLocationPermissionService";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, DollarSign, Home, Eye, Edit, Trash2, X, Save } from "lucide-react";
import type { Property, Location } from "@/types";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function Properties() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    locationId: "",
    location: "",
    monthlyRent: "",
    status: "available" as "available" | "occupied" | "unavailable",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesData, locationsData] = await Promise.all([
        propertyService.getAll(),
        getAllLocations()
      ]);
      
      setProperties(propertiesData);
      setLocations(locationsData);
    } catch (error) {
      console.error("❌ Error loading data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.locationId || !formData.location || !formData.monthlyRent) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const propertyData = {
        locationId: formData.locationId,
        location: formData.location,
        type: "residential", // Valor padrão
        monthlyRent: parseCurrency(formData.monthlyRent),
        status: formData.status,
        description: formData.description,
        propertyIdentifier: "", // Valor padrão vazio
      };

      console.log("📤 Creating property:", propertyData);
      await propertyService.create(propertyData);

      toast({
        title: "Sucesso",
        description: "Imóvel cadastrado com sucesso!",
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("❌ Error creating property:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar imóvel. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProperty || !formData.locationId || !formData.location || !formData.monthlyRent) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const propertyData = {
        locationId: formData.locationId,
        location: formData.location,
        type: selectedProperty.type || "residential",
        monthlyRent: parseCurrency(formData.monthlyRent),
        status: formData.status,
        description: formData.description || "",
        propertyIdentifier: selectedProperty.propertyIdentifier || "",
      };

      console.log("📤 Updating property:", propertyData);
      await propertyService.update(selectedProperty.id, propertyData);

      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });

      setIsViewDialogOpen(false);
      setIsEditMode(false);
      setSelectedProperty(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error("❌ Error updating property:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar imóvel. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await propertyService.delete(propertyId);
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso!",
      });
      setIsViewDialogOpen(false);
      setSelectedProperty(null);
      loadData();
    } catch (error) {
      console.error("❌ Error deleting property:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir imóvel. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (property: Property) => {
    console.log("👆 Card clicked:", property);
    setSelectedProperty(property);
    setIsViewDialogOpen(true);
    setIsEditMode(false);
  };

  const handleEditClick = () => {
    if (!selectedProperty) return;

    setFormData({
      locationId: selectedProperty.locationId || "",
      location: selectedProperty.location || "",
      monthlyRent: formatCurrency(selectedProperty.monthlyRent),
      status: selectedProperty.status,
      description: selectedProperty.description || "",
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      locationId: "",
      location: "",
      monthlyRent: "",
      status: "available",
      description: "",
    });
  };

  const getLocationData = (locationId: string) => {
    return locations.find((loc) => loc.id === locationId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Ocupado
          </Badge>
        );
      case "available":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Vago
          </Badge>
        );
      case "unavailable":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Indisponível
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

  return (
    <>
      <SEO
        title="Imóveis - Gerenciador de Locações"
        description="Gerencie seus imóveis disponíveis para locação"
      />
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Imóveis</h1>
              <p className="text-muted-foreground">Gerencie seus imóveis disponíveis</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum imóvel cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece cadastrando seu primeiro imóvel
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Imóvel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => {
                // Find location name if needed, or use property.location directly
                // Based on previous code, property.location seems to be the name/street
                const locationData = getLocationData(property.locationId || "");
                const statusBadge = getStatusBadge(property.status);

                return (
                  <ScrollReveal key={property.id} delay={0.1}>
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleCardClick(property)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-blue-600">
                              {property.location}
                            </CardTitle>
                            {property.complement && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {property.complement}
                              </p>
                            )}
                          </div>
                          {statusBadge}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Valor:</span>
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(property.monthlyRent)}
                            </span>
                          </div>
                          
                          {/* Removed address/description as requested */}
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog de Criação */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Imóvel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="locationId">Local *</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local" />
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
                  <Label htmlFor="location">Complemento *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Casa 1, Apto 101"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Valor do Aluguel *</Label>
                  <Input
                    id="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: formatCurrency(e.target.value) })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "available" | "occupied" | "unavailable") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Alugado</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Informações adicionais sobre o imóvel"
                  rows={3}
                />
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

        {/* Dialog de Visualização/Edição */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedProperty ? (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Editar Imóvel" : "Detalhes do Imóvel"}
                  </DialogTitle>
                </DialogHeader>

                {!isEditMode ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {getLocationData(selectedProperty.locationId || "")?.name || "Local não definido"}
                        </h3>
                        <p className="text-lg text-muted-foreground">{selectedProperty.location}</p>
                      </div>
                      {getStatusBadge(selectedProperty.status)}
                    </div>

                    <div className="flex items-center gap-2 text-3xl font-bold text-green-600">
                      <DollarSign className="h-8 w-8" />
                      {formatCurrency(selectedProperty.monthlyRent)}
                    </div>

                    {selectedProperty.locationId && getLocationData(selectedProperty.locationId) && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Endereço</h4>
                        <div className="text-muted-foreground">
                          {(() => {
                            const loc = getLocationData(selectedProperty.locationId);
                            return loc ? (
                              <>
                                <p>{loc.street}, {loc.number}</p>
                                <p>{loc.neighborhood}</p>
                                <p>{loc.city}/{loc.state}</p>
                                {loc.zipCode && <p>CEP: {loc.zipCode}</p>}
                              </>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}

                    {selectedProperty.description && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Descrição</h4>
                        <p className="text-muted-foreground">{selectedProperty.description}</p>
                      </div>
                    )}

                    <DialogFooter className="gap-2">
                      <Button variant="destructive" onClick={() => handleDelete(selectedProperty.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                      <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Fechar
                      </Button>
                      <Button onClick={handleEditClick}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-locationId">Local *</Label>
                        <Select
                          value={formData.locationId}
                          onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o local" />
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
                        <Label htmlFor="edit-location">Complemento *</Label>
                        <Input
                          id="edit-location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Ex: Casa 1, Apto 101"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-monthlyRent">Valor do Aluguel *</Label>
                        <Input
                          id="edit-monthlyRent"
                          value={formData.monthlyRent}
                          onChange={(e) => setFormData({ ...formData, monthlyRent: formatCurrency(e.target.value) })}
                          placeholder="R$ 0,00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: "available" | "occupied" | "unavailable") =>
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Disponível</SelectItem>
                            <SelectItem value="occupied">Alugado</SelectItem>
                            <SelectItem value="unavailable">Indisponível</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Descrição</Label>
                      <Textarea
                        id="edit-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Informações adicionais sobre o imóvel"
                        rows={3}
                      />
                    </div>

                    <DialogFooter className="gap-2">
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}