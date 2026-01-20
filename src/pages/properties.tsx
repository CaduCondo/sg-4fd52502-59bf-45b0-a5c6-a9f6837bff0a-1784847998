import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Grid3x3, List, AlertCircle, X, Bed, Bath } from "lucide-react";
import { propertyService, locationService } from "@/services";
import type { Property, Location } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { applyMoneyMask, parseCurrencyToFloat, formatCurrency } from "@/lib/masks";

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    location_id: "",
    property_identifier: "Apartamento",
    complement: "",
    monthly_rent: "",
    status: "available",
    description: "",
    bedrooms: "",
    bathrooms: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, statusFilter, locationFilter]);

  const loadData = async () => {
    try {
      const [propertiesData, locationsData] = await Promise.all([
        propertyService.getAll(),
        locationService.getAll(),
      ]);
      setProperties(propertiesData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    const filtered = properties.filter((property) => {
      const matchesSearch =
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.complement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesLocation = locationFilter === "all" || property.location_id === locationFilter;

      return matchesSearch && matchesStatus && matchesLocation;
    });
    setFilteredProperties(filtered);
  };

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const masked = applyMoneyMask(value);
    setFormData({ ...formData, monthly_rent: masked });
  };

  const handleNumberChange = (field: "bedrooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/\D/g, "");
    const limitedValue = numbersOnly.slice(0, 2);
    setFormData({ ...formData, [field]: limitedValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation for location_id
    if (!formData.location_id || formData.location_id.trim() === "") {
      alert("Por favor, selecione um local");
      return;
    }

    try {
      const selectedLocation = locations.find(loc => loc.id === formData.location_id);
      
      if (!selectedLocation) {
        alert("Local selecionado inválido. Por favor, selecione novamente.");
        return;
      }

      const propertyData = {
        locationId: formData.location_id,
        location: selectedLocation.name,
        propertyIdentifier: formData.property_identifier || "Apartamento",
        complement: formData.complement || undefined,
        value: parseCurrencyToFloat(formData.monthly_rent),
        status: formData.status as "available" | "occupied" | "unavailable",
        description: formData.description,
        rooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      };

      console.log("Dados a serem salvos:", propertyData);
      console.log("locationId:", propertyData.locationId);

      if (editingProperty) {
        await propertyService.update(editingProperty.id, propertyData);
      } else {
        await propertyService.create(propertyData);
      }

      await loadData();
      setIsDialogOpen(false);
      setIsEditMode(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      alert("Erro ao salvar imóvel. Por favor, verifique os dados e tente novamente.");
    }
  };

  const handleCardClick = (property: Property) => {
    setEditingProperty(property);
    
    const locationId = property.location_id || "";
    
    console.log("=== DEBUG handleCardClick ===");
    console.log("Property location_id:", property.location_id);
    console.log("Property location name:", property.location);
    console.log("Setting formData.location_id to:", locationId);
    
    setFormData({
      location_id: locationId,
      property_identifier: property.property_identifier || "Apartamento",
      complement: property.complement || "",
      monthly_rent: formatCurrency(property.value || property.monthly_rent || 0).replace("R$", "").trim(),
      status: property.status,
      description: property.description || "",
      bedrooms: property.rooms?.toString() || property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
    });
    
    console.log("Locations available:", locations.map(l => ({ id: l.id, name: l.name })));
    console.log("=== END DEBUG ===");
    
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEnableEdit = () => {
    setIsEditMode(true);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPropertyToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!propertyToDelete) return;

    try {
      await propertyService.remove(propertyToDelete);
      await loadData();
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      location_id: "",
      property_identifier: "Apartamento",
      complement: "",
      monthly_rent: "",
      status: "available",
      description: "",
      bedrooms: "",
      bathrooms: "",
    });
    setEditingProperty(null);
    setIsEditMode(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      available: "default",
      occupied: "secondary",
      unavailable: "destructive",
    };
    const labels: Record<string, string> = {
      available: "Disponível",
      occupied: "Ocupado",
      unavailable: "Indisponível",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Imóveis - Gerenciador de Locações" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
            <p className="text-muted-foreground">
              Gerencie os imóveis disponíveis para locação
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Imóvel
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-1 max-w-2xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por local, complemento ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Locais</SelectItem>
                      {[...locations]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Ocupado</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 border rounded-md p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === "grid" && (
          <ScrollReveal>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => (
                <Card 
                  key={property.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleCardClick(property)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-blue-600">
                          {property.location}
                        </CardTitle>
                        {property.complement && (
                          <p className="text-sm text-slate-600 mt-1">
                            {property.complement}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(property.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-1.5">
                      {(property.rooms || property.bedrooms || property.bathrooms) && (
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          {(property.rooms || property.bedrooms) && (
                            <div className="flex items-center gap-1">
                              <Bed className="h-4 w-4" />
                              <span>{property.rooms || property.bedrooms} Quartos</span>
                            </div>
                          )}
                          {property.bathrooms && (
                            <div className="flex items-center gap-1">
                              <Bath className="h-4 w-4" />
                              <span>{property.bathrooms} Banheiros</span>
                            </div>
                          )}
                        </div>
                      )}

                      {property.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {property.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 mt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Aluguel</p>
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(property.value || property.monthly_rent || 0)}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => confirmDelete(e, property.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollReveal>
        )}

        {viewMode === "table" && (
          <ScrollReveal>
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Complemento</TableHead>
                    <TableHead>Quartos</TableHead>
                    <TableHead>Banheiros</TableHead>
                    <TableHead>Aluguel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow 
                      key={property.id}
                      className="cursor-pointer"
                      onClick={() => handleCardClick(property)}
                    >
                      <TableCell className="font-medium text-blue-600">
                        {property.location}
                      </TableCell>
                      <TableCell>
                        {property.complement || "-"}
                      </TableCell>
                      <TableCell>
                        {(property.rooms || property.bedrooms) ? (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            <span>{property.rooms || property.bedrooms}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {property.bathrooms ? (
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            <span>{property.bathrooms}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(property.value || property.monthly_rent || 0)}</TableCell>
                      <TableCell>{getStatusBadge(property.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => confirmDelete(e, property.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollReveal>
        )}

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? (isEditMode ? "Editar Imóvel" : "Detalhes do Imóvel") : "Novo Imóvel"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location_id">Local *</Label>
                  <Select
                    key={`location-select-${formData.location_id}-${isDialogOpen}`}
                    value={formData.location_id}
                    onValueChange={(value) => {
                      console.log("Select onValueChange called with:", value);
                      setFormData({...formData, location_id: value});
                    }}
                    disabled={editingProperty && !isEditMode}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um local" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...locations]
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
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Ex: Apto 201, Bloco B, Casa 3..."
                    disabled={editingProperty && !isEditMode}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Quartos</Label>
                    <Input
                      id="bedrooms"
                      type="text"
                      inputMode="numeric"
                      value={formData.bedrooms}
                      onChange={(e) => handleNumberChange("bedrooms", e.target.value)}
                      placeholder="0"
                      disabled={editingProperty && !isEditMode}
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Banheiros</Label>
                    <Input
                      id="bathrooms"
                      type="text"
                      inputMode="numeric"
                      value={formData.bathrooms}
                      onChange={(e) => handleNumberChange("bathrooms", e.target.value)}
                      placeholder="0"
                      disabled={editingProperty && !isEditMode}
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Aluguel Mensal (R$) *</Label>
                  <Input
                    id="monthly_rent"
                    type="text"
                    inputMode="decimal"
                    value={formData.monthly_rent}
                    onChange={handleMoneyChange}
                    placeholder="0,00"
                    required
                    disabled={editingProperty && !isEditMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    disabled={editingProperty && !isEditMode}
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
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Informações adicionais..."
                    disabled={editingProperty && !isEditMode}
                  />
                </div>
              </div>

              <DialogFooter>
                {editingProperty && !isEditMode ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleEnableEdit}
                    >
                      Editar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (isEditMode) {
                          setIsEditMode(false);
                        } else {
                          setIsDialogOpen(false);
                          resetForm();
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingProperty ? "Salvar" : "Cadastrar"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita e removerá todos os dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}