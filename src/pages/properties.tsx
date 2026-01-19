import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAll as getAllProperties, create as createProperty, remove as deleteProperty, update as updateProperty } from "@/services/propertyService";
import { getAll as getAllLocations } from "@/services/locationService";
import type { Property, Location as LocationType } from "@/types";
import { applyRealMask, removeMask, formatCurrency } from "@/lib/masks";

// Simplified form state - only property-specific fields
interface PropertyFormState {
  locationId: string;
  complement: string;
  value: string;
  rooms: string;
  bathrooms: string;
  description: string;
  status: "available" | "occupied" | "unavailable";
}

const INITIAL_FORM_STATE: PropertyFormState = {
  locationId: "",
  complement: "",
  value: "",
  rooms: "",
  bathrooms: "",
  description: "",
  status: "available",
};

export default function Properties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PropertyFormState>(INITIAL_FORM_STATE);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Property["status"]>("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"alphabetic" | "status" | "value-asc" | "value-desc" | "none">("none");

  // Get selected location for displaying address info
  const selectedLocation = locations.find(loc => loc.id === formData.locationId);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await getAllProperties();
      const mapped = data.map((prop: any) => ({
        ...prop,
        locationId: prop.location_id,
        propertyIdentifier: prop.property_identifier,
        monthlyRent: prop.monthly_rent,
        hasGarage: prop.has_garage,
        garageValue: prop.garage_value,
        rooms: prop.rooms || 0,
        bathrooms: prop.bathrooms || 0,
        area: prop.area || 0,
      }));
      setProperties(mapped);
    } catch (error) {
      console.error("Erro ao carregar imóveis:", error);
      toast({ 
        title: "Erro ao carregar imóveis",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os locais.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadProperties();
    loadLocations();
  }, []);

  const getLocationData = (locationId: string): LocationType | undefined => {
    return locations.find((loc: LocationType) => loc.id === locationId);
  };

  const handleOpenCreateDialog = () => {
    setFormData(INITIAL_FORM_STATE);
    setIsEditing(false);
    setSelectedProperty(null);
    setIsDialogOpen(true);
  };

  // Fix: Renaming function to match usage or referencing the existing one
  const handleNewProperty = handleOpenCreateDialog;

  const handleOpenEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setIsEditing(true);
    
    setFormData({
      locationId: property.locationId || "",
      complement: property.complement || "",
      // FIX: Value is already in cents, do NOT multiply by 100 again
      value: property.value ? applyRealMask(property.value.toString()) : "",
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      description: property.description || "",
      status: property.status || "available",
    });
    
    setIsDialogOpen(true);
  };

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    
    setFormData({
      locationId: property.locationId || "",
      complement: property.complement || "",
      value: property.value ? applyRealMask(property.value.toString()) : "",
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      description: property.description || "",
      status: property.status || "available",
    });
    
    setIsViewDialogOpen(true);
  };

  const handleDeleteProperty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await deleteProperty(id);
      toast({ title: "Sucesso", description: "Imóvel excluído com sucesso!" });
      loadProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({ title: "Erro", description: "Não foi possível excluir o imóvel.", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare payload with correct types
      const payload: any = {
        locationId: formData.locationId || null, // Handle empty string as null
        complement: formData.complement,
        rooms: parseInt(formData.rooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        value: parseFloat(formData.value.replace(/\./g, "").replace(",", ".")) || 0,
        description: formData.description,
        status: formData.status,
      };

      if (isEditing && selectedProperty) {
        await updateProperty(selectedProperty.id, payload);
        toast({ title: "Imóvel atualizado com sucesso!" });
      } else {
        await createProperty(payload);
        toast({ title: "Imóvel criado com sucesso!" });
      }

      setIsDialogOpen(false);
      loadProperties();
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      toast({ 
        title: "Erro ao salvar imóvel", 
        description: "Verifique os dados e tente novamente. Certifique-se de selecionar um local.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available": return <Badge className="bg-green-100 text-green-800 border-green-200">Disponível</Badge>;
      case "occupied": return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ocupado</Badge>;
      case "unavailable": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Indisponível</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <SEO title="Imóveis - Gerenciador de Locações" />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Imóveis
              </h1>
              <p className="text-muted-foreground mt-1">
                {properties.length} imóveis cadastrados
              </p>
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>

          {/* Filters Section */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Search Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <Input
                    placeholder="Local, complemento, observação..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Ocupado</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Local</label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os locais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os locais</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordenar por</label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alphabetic">Alfabético (Local)</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="value-asc">Valor Menor</SelectItem>
                      <SelectItem value="value-desc">Valor Maior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </CardContent>
          </Card>

          {loading && properties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando imóveis...</p>
            </div>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum imóvel cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando seu primeiro imóvel
                </p>
                <Button onClick={handleNewProperty}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Imóvel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Apply filters and sorting */}
              {(() => {
                // 1. Filter by search text
                let filtered = properties.filter((property) => {
                  if (!searchText) return true;
                  const location = locations.find((l) => l.id === property.locationId);
                  const searchLower = searchText.toLowerCase();
                  return (
                    location?.name.toLowerCase().includes(searchLower) ||
                    property.complement?.toLowerCase().includes(searchLower) ||
                    property.description?.toLowerCase().includes(searchLower)
                  );
                });

                // 2. Filter by status
                if (statusFilter !== "all") {
                  filtered = filtered.filter((p) => p.status === statusFilter);
                }

                // 3. Filter by location
                if (locationFilter !== "all") {
                  filtered = filtered.filter((p) => p.locationId === locationFilter);
                }

                // 4. Sort
                filtered.sort((a, b) => {
                  const locA = locations.find((l) => l.id === a.locationId);
                  const locB = locations.find((l) => l.id === b.locationId);

                  switch (sortBy) {
                    case "alphabetic":
                      return (locA?.name || "").localeCompare(locB?.name || "");
                    case "status":
                      return a.status.localeCompare(b.status);
                    case "value-asc":
                      return a.value - b.value;
                    case "value-desc":
                      return b.value - a.value;
                    default:
                      return 0;
                  }
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((property) => {
                      const location = locations.find((l) => l.id === property.locationId);
                      return (
                        <Card 
                          key={property.id} 
                          className="hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => handleViewProperty(property)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg text-blue-600">
                                  {location?.name || "Local não identificado"}
                                </CardTitle>
                                {property.complement && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {property.complement}
                                  </p>
                                )}
                              </div>
                              {getStatusBadge(property.status || "available")}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>🛏️ {property.rooms || 0} quartos</span>
                              <span>🚿 {property.bathrooms || 0} banheiros</span>
                            </div>
                            
                            {property.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {property.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="text-lg font-bold text-emerald-600">
                                {property.value ? formatCurrency(property.value / 100) : "R$ 0,00"}
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => handleDeleteProperty(property.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}

              {/* No results message */}
              {(() => {
                let filtered = properties.filter((property) => {
                  if (!searchText) return true;
                  const location = locations.find((l) => l.id === property.locationId);
                  const searchLower = searchText.toLowerCase();
                  return (
                    location?.name.toLowerCase().includes(searchLower) ||
                    property.complement?.toLowerCase().includes(searchLower) ||
                    property.description?.toLowerCase().includes(searchLower)
                  );
                });

                if (statusFilter !== "all") {
                  filtered = filtered.filter((p) => p.status === statusFilter);
                }

                if (locationFilter !== "all") {
                  filtered = filtered.filter((p) => p.locationId === locationFilter);
                }

                if (filtered.length === 0) {
                  return (
                    <Card className="mt-6">
                      <CardContent className="text-center py-12">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                        <p className="text-muted-foreground">
                          Tente ajustar os filtros de busca
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })()}
            </>
          )}
        </div>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Imóvel</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* View Only Fields */}
              <div className="space-y-2">
                <Label>Local</Label>
                <div className="p-2 bg-muted rounded-md">
                   {locations.find(l => l.id === formData.locationId)?.name || "Local não identificado"}
                </div>
              </div>

              {/* Address Details if location selected */}
              {selectedLocation && (
                <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Endereço</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLocation.street}, {selectedLocation.number}
                        {selectedLocation.complement && ` - ${selectedLocation.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLocation.neighborhood} - {selectedLocation.city}/{selectedLocation.state}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Complemento</Label>
                    <div className="p-2 bg-muted rounded-md min-h-[40px]">
                      {formData.complement || "-"}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>Valor</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formData.value || "R$ 0,00"}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>Quartos</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formData.rooms || "0"}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>Banheiros</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formData.bathrooms || "0"}
                    </div>
                 </div>
              </div>
              
              <div className="space-y-2">
                 <Label>Status</Label>
                 <div className="pt-1">
                   {getStatusBadge(formData.status)}
                 </div>
              </div>

              <div className="space-y-2">
                 <Label>Observações</Label>
                 <div className="p-2 bg-muted rounded-md min-h-[80px] whitespace-pre-wrap">
                   {formData.description || "Nenhuma observação."}
                 </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={() => {
                   setIsViewDialogOpen(false);
                   if (selectedProperty) handleOpenEditDialog(selectedProperty);
                }}>
                  Editar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Imóvel" : "Cadastrar Novo Imóvel"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Selection */}
              <div className="space-y-2">
                <Label htmlFor="location">Local *</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  required
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Display location address (read-only) */}
              {selectedLocation && (
                <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Endereço do Local</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLocation.street}, {selectedLocation.number}
                        {selectedLocation.complement && ` - ${selectedLocation.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLocation.neighborhood} - {selectedLocation.city}/{selectedLocation.state}
                      </p>
                      {selectedLocation.zip_code && (
                        <p className="text-sm text-muted-foreground">
                          CEP: {selectedLocation.zip_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Complement */}
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Ex: Apto 101, Sala 5"
                  />
                </div>

                {/* Value */}
                <div className="space-y-2">
                  <Label htmlFor="value">Valor</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: applyRealMask(e.target.value) })}
                    placeholder="R$ 0,00"
                  />
                </div>

                {/* Quartos e Banheiros */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rooms">Quartos</Label>
                    <Input
                      id="rooms"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.rooms}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setFormData({ ...formData, rooms: value });
                      }}
                      placeholder="Ex: 3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Banheiros</Label>
                    <Input
                      id="bathrooms"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.bathrooms}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setFormData({ ...formData, bathrooms: value });
                      }}
                      placeholder="Ex: 2"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Ocupado</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description (Footer) */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Observações</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Adicione observações sobre o imóvel..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {isEditing ? "Salvar Alterações" : "Cadastrar Imóvel"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}