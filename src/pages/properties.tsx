import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Define form state interface that handles string values for inputs
interface PropertyFormState {
  locationId: string;
  type: string;
  propertyIdentifier: string;
  description: string;
  monthlyRent: string;
  status: "available" | "occupied" | "unavailable";
  complement: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  area: string;
  rooms: string;
  bathrooms: string;
  hasGarage: boolean;
  garageValue: string;
  value: string;
}

const INITIAL_FORM_STATE: PropertyFormState = {
  locationId: "",
  type: "",
  propertyIdentifier: "",
  description: "",
  monthlyRent: "",
  status: "available",
  complement: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  area: "",
  rooms: "",
  bathrooms: "",
  hasGarage: false,
  garageValue: "",
  value: "",
};

export default function Properties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // Unified form state
  const [formData, setFormData] = useState<PropertyFormState>(INITIAL_FORM_STATE);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await getAllProperties();
      // Map DB snake_case to frontend camelCase
      const mapped = data.map((prop: any) => ({
        ...prop,
        locationId: prop.location_id,
        propertyIdentifier: prop.property_identifier,
        monthlyRent: prop.monthly_rent,
        zipCode: prop.zip_code,
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

  const handleOpenEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setIsEditing(true);
    
    // Populate form with existing data
    setFormData({
      locationId: property.locationId || "",
      type: property.type || "",
      propertyIdentifier: property.propertyIdentifier || "",
      description: property.description || "",
      monthlyRent: property.monthlyRent ? applyRealMask((property.monthlyRent * 100).toString()) : "",
      status: property.status || "available",
      complement: property.complement || "",
      address: property.address || "",
      number: property.number || "",
      neighborhood: property.neighborhood || "",
      city: property.city || "",
      state: property.state || "",
      zipCode: property.zipCode || "",
      area: property.area?.toString() || "",
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      hasGarage: property.hasGarage || false,
      garageValue: property.garageValue ? applyRealMask((property.garageValue * 100).toString()) : "",
      value: property.value ? applyRealMask((property.value * 100).toString()) : "",
    });
    
    setIsDialogOpen(true);
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
      // Prepare data for DB (convert types and map to snake_case if needed by service)
      // The service seems to handle partial mapping, but we should be explicit with what the DB expects
      // based on the schema error we saw earlier.
      
      const payload = {
        location_id: formData.locationId,
        type: formData.type,
        property_identifier: formData.propertyIdentifier,
        description: formData.description,
        monthly_rent: parseFloat(removeMask(formData.monthlyRent)) || 0,
        status: formData.status,
        complement: formData.complement,
        address: formData.address,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        area: parseFloat(formData.area) || 0,
        rooms: parseInt(formData.rooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        has_garage: formData.hasGarage,
        garage_value: parseFloat(removeMask(formData.garageValue)) || 0,
        value: parseFloat(removeMask(formData.value)) || 0,
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
        description: "Verifique os dados e tente novamente.",
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
                Gerencie o cadastro de imóveis disponíveis para locação
              </p>
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>

          {loading && properties.length === 0 ? (
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
                <Button onClick={handleOpenCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Imóvel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <Card
                  key={property.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow relative"
                  onClick={() => handleOpenEditDialog(property)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-blue-600">
                          {getLocationData(property.locationId)?.name || property.location || "Local não identificado"}
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
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Imóvel" : "Cadastrar Novo Imóvel"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Location Selection */}
                <div className="space-y-2">
                  <Label htmlFor="location">Local *</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => {
                      const loc = getLocationData(value);
                      setFormData(prev => ({
                         ...prev, 
                         locationId: value,
                         // Auto-fill address fields from location if available
                         address: loc?.street || prev.address,
                         neighborhood: loc?.neighborhood || prev.neighborhood,
                         city: loc?.city || prev.city,
                         state: loc?.state || prev.state,
                         zipCode: loc?.zip_code || prev.zipCode
                      }));
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
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
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

                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: applyCepMask(e.target.value) })}
                    placeholder="00000-000"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Ex: Apto 101"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                
                 <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rooms">Quartos</Label>
                  <Input
                    id="rooms"
                    type="number"
                    value={formData.rooms}
                    onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Valores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Valor Total (Venda/Locação)</Label>
                    <Input
                      id="value"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: applyRealMask(e.target.value) })}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Valor Aluguel (Mensal)</Label>
                    <Input
                      id="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: applyRealMask(e.target.value) })}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="garageValue">Valor Garagem</Label>
                    <Input
                      id="garageValue"
                      value={formData.garageValue}
                      onChange={(e) => setFormData({ ...formData, garageValue: applyRealMask(e.target.value) })}
                      placeholder="R$ 0,00"
                      disabled={!formData.hasGarage}
                    />
                  </div>
                   <div className="flex items-center space-x-2 h-10 mt-6">
                    <input
                      type="checkbox"
                      id="hasGarage"
                      checked={formData.hasGarage}
                      onChange={(e) => setFormData({ ...formData, hasGarage: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hasGarage">Possui Garagem</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição / Observações</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Descreva detalhes do imóvel..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
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