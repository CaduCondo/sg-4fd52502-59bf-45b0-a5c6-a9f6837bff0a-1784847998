import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, Edit2, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAll as getAllProperties, create as createProperty, remove as deleteProperty, update as updateProperty } from "@/services/propertyService";
import { getAll as getAllLocations } from "@/services/locationService";
import type { Property, Location as LocationType } from "@/types";
import { applyRealMask, applyCepMask, removeMask, formatCurrency } from "@/lib/masks";

export default function Properties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newProperty, setNewProperty] = useState({
    locationId: "",
    complement: "",
    description: "",
    value: "",
    rooms: "",
    bathrooms: "",
    area: "",
    hasGarage: false,
    status: "available" as "available" | "occupied" | "unavailable",
  });

  const [editForm, setEditForm] = useState({
    locationId: "",
    complement: "",
    description: "",
    value: "",
    rooms: "",
    bathrooms: "",
    area: "",
    hasGarage: false,
    status: "available" as "available" | "occupied" | "unavailable",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesData, locationsData] = await Promise.all([
        getAllProperties(),
        getAllLocations()
      ]);
      setProperties(propertiesData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os imóveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationData = (locationId: string): LocationType | undefined => {
    return locations.find((loc: LocationType) => loc.id === locationId);
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const propertyData = {
        ...newProperty,
        location: getLocationData(newProperty.locationId)?.address || "",
        value: parseFloat(removeMask(newProperty.value)),
        rooms: parseInt(newProperty.rooms) || 0,
        bathrooms: parseInt(newProperty.bathrooms) || 0,
        area: parseFloat(newProperty.area) || 0,
        status: newProperty.status as "available" | "occupied" | "unavailable"
      };
      
      await createProperty(propertyData);

      toast({
        title: "Sucesso",
        description: "Imóvel cadastrado com sucesso!",
      });

      setIsCreateDialogOpen(false);
      setNewProperty({
        locationId: "",
        complement: "",
        description: "",
        value: "",
        rooms: "",
        bathrooms: "",
        area: "",
        hasGarage: false,
        status: "available",
      });
      loadData();
    } catch (error) {
      console.error("Error creating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProperty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await deleteProperty(id);
      
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso!",
      });
      
      loadData();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (property: Property) => {
    setSelectedProperty(property);
    setEditForm({
      locationId: property.locationId || "",
      complement: property.complement || "",
      description: property.description || "",
      value: applyRealMask(((property.value || 0) * 100).toString()),
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      area: property.area?.toString() || "",
      hasGarage: property.hasGarage || false,
      status: property.status || "available",
    });
    setIsEditing(false);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedProperty) {
      setEditForm({
        locationId: selectedProperty.locationId || "",
        complement: selectedProperty.complement || "",
        description: selectedProperty.description || "",
        value: applyRealMask(((selectedProperty.value || 0) * 100).toString()),
        rooms: selectedProperty.rooms?.toString() || "",
        bathrooms: selectedProperty.bathrooms?.toString() || "",
        area: selectedProperty.area?.toString() || "",
        hasGarage: selectedProperty.hasGarage || false,
        status: selectedProperty.status || "available",
      });
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedProperty) return;

    try {
      const updatedData = {
        ...selectedProperty,
        locationId: editForm.locationId,
        location: getLocationData(editForm.locationId)?.address || "",
        complement: editForm.complement,
        description: editForm.description,
        value: parseFloat(removeMask(editForm.value)),
        rooms: parseInt(editForm.rooms) || 0,
        bathrooms: parseInt(editForm.bathrooms) || 0,
        area: parseFloat(editForm.area) || 0,
        hasGarage: editForm.hasGarage,
        status: editForm.status,
      };

      await updateProperty(selectedProperty.id, updatedData);

      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });

      setIsEditing(false);
      setIsViewDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o imóvel.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Disponível</Badge>;
      case "occupied":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ocupado</Badge>;
      case "unavailable":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Indisponível</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Desconhecido</Badge>;
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
                Gerencie o cadastro de imóveis disponíveis para locação
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando imóveis...</p>
            </div>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum imóvel cadastrado</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece cadastrando seu primeiro imóvel
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Imóvel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => {
                const location = getLocationData(property.locationId || "");
                return (
                  <Card
                    key={property.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow relative"
                    onClick={() => handleCardClick(property)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-blue-600">
                            {getLocationData(property.locationId)?.name || property.location}
                          </CardTitle>
                          {property.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {getLocationData(property.locationId)?.complement}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(property.status || "available")}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm mb-3 line-clamp-2">
                        {property.description || "Sem descrição"}
                      </p>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-lg font-bold text-emerald-600">
                          {property.value ? formatCurrency(property.value) : "R$ 0,00"}
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
          )}
        </div>

        {/* Create Property Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Imóvel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Local <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newProperty.locationId}
                    onValueChange={(value) => {
                      const selectedLocation = locations.find(loc => loc.id === value);
                      setNewProperty({ 
                        ...newProperty, 
                        locationId: value,
                        location: selectedLocation?.name || ""
                      });
                    }}
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

                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={newProperty.complement}
                    onChange={(e) => setNewProperty({ ...newProperty, complement: e.target.value })}
                    placeholder="Ex: Apto 101, Casa 2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    Valor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="value"
                    value={newProperty.value}
                    onChange={(e) => setNewProperty({ ...newProperty, value: applyRealMask(e.target.value) })}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newProperty.status}
                    onValueChange={(value: "available" | "occupied" | "unavailable") =>
                      setNewProperty({ ...newProperty, status: value })
                    }
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

                <div className="space-y-2">
                  <Label htmlFor="rooms">Quartos</Label>
                  <Input
                    id="rooms"
                    type="number"
                    value={newProperty.rooms}
                    onChange={(e) => setNewProperty({ ...newProperty, rooms: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={newProperty.bathrooms}
                    onChange={(e) => setNewProperty({ ...newProperty, bathrooms: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={newProperty.area}
                    onChange={(e) => setNewProperty({ ...newProperty, area: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasGarage"
                    checked={newProperty.hasGarage}
                    onChange={(e) => setNewProperty({ ...newProperty, hasGarage: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="hasGarage">Possui Garagem</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View/Edit Property Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Editar Imóvel" : "Detalhes do Imóvel"}
              </DialogTitle>
            </DialogHeader>

            {selectedProperty && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Local</Label>
                    {isEditing ? (
                      <Select value={editForm.locationId} onValueChange={(value) => setEditForm({ ...editForm, locationId: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location: LocationType) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.address} - {location.number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">
                        {getLocationData(selectedProperty.locationId || "")?.address || selectedProperty.location || "Não definido"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    {isEditing ? (
                      <Input
                        value={editForm.complement}
                        onChange={(e) => setEditForm({ ...editForm, complement: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">
                        {selectedProperty.complement || "Não definido"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Valor</Label>
                    {isEditing ? (
                      <Input
                        value={editForm.value}
                        onChange={(e) => setEditForm({ ...editForm, value: applyRealMask(e.target.value) })}
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">
                        {selectedProperty.value ? formatCurrency(selectedProperty.value) : "R$ 0,00"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select
                        value={editForm.status}
                        onValueChange={(value: "available" | "occupied" | "unavailable") =>
                          setEditForm({ ...editForm, status: value })
                        }
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
                    ) : (
                      <div className="p-2">
                        {getStatusBadge(selectedProperty.status || "available")}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Quartos</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.rooms}
                        onChange={(e) => setEditForm({ ...editForm, rooms: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">
                        {selectedProperty.rooms || 0}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Banheiros</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.bathrooms}
                        onChange={(e) => setEditForm({ ...editForm, bathrooms: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">
                        {selectedProperty.bathrooms || 0}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Área (m²)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.area}
                        onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">
                        {selectedProperty.area || 0} m²
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <input
                          type="checkbox"
                          id="editHasGarage"
                          checked={editForm.hasGarage}
                          onChange={(e) => setEditForm({ ...editForm, hasGarage: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="editHasGarage">Possui Garagem</Label>
                      </>
                    ) : (
                      <p className="text-sm font-medium p-2">
                        {selectedProperty.hasGarage ? "✓ Possui Garagem" : "✗ Sem Garagem"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded">
                      {selectedProperty.description || "Sem descrição"}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  {isEditing ? (
                    <>
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleSaveEdit}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                        Fechar
                      </Button>
                      <Button type="button" onClick={handleEditClick}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}