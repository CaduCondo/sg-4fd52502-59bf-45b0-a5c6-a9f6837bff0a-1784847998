import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Property, Location } from "@/types";
import { createProperty, updateProperty, deleteProperty, list as listProperties } from "@/services/propertyService";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Home, Search, Edit, Trash2 } from "lucide-react";

interface PropertyFormState {
  locationId: string;
  complement: string;
  value: string;
  status: "available" | "occupied" | "unavailable";
  rooms: string;
  bathrooms: string;
  description: string;
}

const INITIAL_FORM_STATE: PropertyFormState = {
  locationId: "",
  complement: "",
  value: "",
  status: "available",
  rooms: "",
  bathrooms: "",
  description: "",
};

export default function Properties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormState>(INITIAL_FORM_STATE);
  
  // Filters
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"alphabetic" | "status" | "value-asc" | "value-desc" | "none">("alphabetic");

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesData, locationsRes] = await Promise.all([
        listProperties(),
        supabase.from("locations").select("*").order("name")
      ]);

      setProperties(propertiesData);
      if (locationsRes.data) {
        setLocations(locationsRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de imóveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateDialog = () => {
    setSelectedProperty(null);
    setFormData(INITIAL_FORM_STATE);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      locationId: property.locationId || "",
      complement: property.complement || "",
      value: property.value ? property.value.toString() : "0",
      status: property.status,
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      description: property.description || "",
    });
    setIsEditing(true);
    setIsViewDialogOpen(false); // Close view dialog if open
    setIsDialogOpen(true);
  };

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsViewDialogOpen(true);
  };

  const handleDeleteProperty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await deleteProperty(id);
      toast({ title: "Imóvel excluído com sucesso!" });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use raw value from input
      let valueNumber = 0;
      if (formData.value) {
        valueNumber = parseFloat(formData.value);
      }

      const payload: Partial<Property> = {
        locationId: formData.locationId,
        complement: formData.complement,
        value: isNaN(valueNumber) ? 0 : valueNumber,
        status: formData.status,
        rooms: parseInt(formData.rooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        description: formData.description,
      };

      if (selectedProperty) {
        await updateProperty(selectedProperty.id, payload);
        toast({ title: "Imóvel atualizado com sucesso!" });
      } else {
        await createProperty(payload);
        toast({ title: "Imóvel criado com sucesso!" });
      }

      setIsDialogOpen(false);
      setIsViewDialogOpen(false);
      setIsEditing(false);
      loadData();
    } catch (error) {
      console.error("Error saving property:", error);
      toast({
        title: "Erro ao salvar imóvel",
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = properties
    .filter((p) => {
      const locationName = p.location?.toLowerCase() || "";
      const complement = p.complement?.toLowerCase() || "";
      const search = searchText.toLowerCase();
      
      const matchesSearch = locationName.includes(search) || complement.includes(search);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesLocation = locationFilter === "all" || p.locationId === locationFilter;

      return matchesSearch && matchesStatus && matchesLocation;
    })
    .sort((a, b) => {
      if (sortBy === "alphabetic") {
        return (a.location || "").localeCompare(b.location || "");
      }
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "value-asc") return (a.value || 0) - (b.value || 0);
      if (sortBy === "value-desc") return (b.value || 0) - (a.value || 0);
      return 0;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>;
      case "occupied":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Alugado</Badge>;
      case "unavailable":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Indisponível</Badge>;
      default:
        return <Badge>Desconhecido</Badge>;
    }
  };

  const formatCurrency = (value: number | undefined) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
            <p className="text-muted-foreground">
              Gerencie seus imóveis disponíveis para locação
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <Home className="mr-2 h-4 w-4" />
            Novo Imóvel
          </Button>
        </div>

        {/* Filters Section - All in one row */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              {/* Search */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por local..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="occupied">Alugado</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label>Local</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetic">Alfabético (Local)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="value-asc">Valor (Menor - Maior)</SelectItem>
                    <SelectItem value="value-desc">Valor (Maior - Menor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Carregando imóveis...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((property) => (
              <Card 
                key={property.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleViewProperty(property)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    {getStatusBadge(property.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-lg text-primary truncate">
                        {property.location || "Local não identificado"}
                      </h3>
                      {property.complement && (
                        <p className="text-sm text-muted-foreground truncate">
                          {property.complement}
                        </p>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t flex justify-between items-center">
                      <div className="flex items-center text-green-600 font-bold text-lg">
                        {formatCurrency(property.value)}
                      </div>
                      <div className="flex gap-2 text-muted-foreground text-sm">
                        {property.rooms && <span>{property.rooms} dorms</span>}
                        {property.rooms && property.bathrooms && <span>•</span>}
                        {property.bathrooms && <span>{property.bathrooms} banho</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum imóvel encontrado com os filtros atuais.
              </div>
            )}
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Imóvel</DialogTitle>
            </DialogHeader>
            {selectedProperty && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Local</Label>
                    <p className="font-medium text-lg">{selectedProperty.location || "Não identificado"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor</Label>
                    <p className="font-medium text-lg text-green-600">{formatCurrency(selectedProperty.value)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Complemento</Label>
                  <p className="font-medium">{selectedProperty.complement || "-"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedProperty.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Configuração</Label>
                    <p className="font-medium">
                      {selectedProperty.rooms || 0} quartos • {selectedProperty.bathrooms || 0} banheiros
                    </p>
                  </div>
                </div>

                {selectedProperty.description && (
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="text-sm mt-1">{selectedProperty.description}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
              {selectedProperty && (
                <Button onClick={() => handleOpenEditDialog(selectedProperty)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Editar Imóvel" : "Novo Imóvel"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="locationId">Local</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Ex: Apto 101, Bloco B"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                    placeholder="0.00"
                  />
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
                      <SelectItem value="occupied">Alugado</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rooms">Quartos</Label>
                  <Input
                    id="rooms"
                    type="number"
                    min="0"
                    value={formData.rooms}
                    onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {isEditing && selectedProperty && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={(e) => handleDeleteProperty(selectedProperty.id, e)}
                    className="mr-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}