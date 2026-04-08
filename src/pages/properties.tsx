import { useState, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Bed, Bath, Trash2, Grid3x3, List } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { formatCurrency } from "@/lib/masks";
import type { Property } from "@/types";
import { useProperties, type PropertyFormData } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFilters } from "@/components/properties/PropertyFilters";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import { PropertyDeleteAlert } from "@/components/properties/PropertyDeleteAlert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { propertyService } from "@/services";

const INITIAL_FORM_DATA: PropertyFormData = {
  location_id: "",
  property_identifier: "",
  complement: "",
  rooms: "",
  bathrooms: "",
  monthly_rent: "",
  description: "",
  status: "available",
  images: [],
  hasFurniture: false,
  acceptsPets: false,
  area: "",
  hasGarage: false,
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  available: "default",
  occupied: "secondary",
  unavailable: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Disponível",
  occupied: "Ocupado",
  unavailable: "Indisponível",
};

export default function PropertiesPage() {
  const {
    filteredProperties,
    locations,
    loading,
    searchTerm,
    statusFilter,
    selectedLocations,
    sortOrder,
    viewMode,
    setSearchTerm,
    setStatusFilter,
    setSelectedLocations,
    setSortOrder,
    setViewMode,
    handleLocationToggle,
    createProperty,
    updateProperty,
    deleteProperty,
  } = useProperties();

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_DATA);

  const handleNumberChange = useCallback((field: "rooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, "").slice(0, 2);
    setFormData(prev => ({ ...prev, [field]: numbersOnly }));
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const fileArray = Array.from(files);
    
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          newImages.push(reader.result as string);
          if (newImages.length === fileArray.length) {
            setFormData(prev => ({
              ...prev,
              images: [...prev.images, ...newImages],
            }));
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setEditingProperty(null);
    setIsEditMode(false);
    setIsViewMode(false);
  }, []);

  const prepareFormDataFromProperty = useCallback((property: Property): PropertyFormData => ({
    location_id: property.locationId || "",
    property_identifier: property.propertyIdentifier || "",
    complement: property.complement || "",
    rooms: String(property.rooms || ""),
    bathrooms: String(property.bathrooms || ""),
    monthly_rent: formatCurrency(property.value || 0),
    description: property.description || "",
    status: property.status || "available",
    images: property.images || [],
    hasFurniture: property.hasFurniture || false,
    acceptsPets: property.acceptsPets || false,
    area: String(property.area || ""),
    hasGarage: property.hasGarage || false,
  }), []);

  const handleEdit = useCallback((property: Property) => {
    setEditingProperty(property);
    setFormData(prepareFormDataFromProperty(property));
    setIsDialogOpen(true);
  }, [prepareFormDataFromProperty]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, formData);
        toast({
          title: "Sucesso!",
          description: "Imóvel atualizado com sucesso.",
        });
      } else {
        await createProperty(formData);
        toast({
          title: "Sucesso!",
          description: "Imóvel criado com sucesso.",
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar o imóvel. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [editingProperty, formData, updateProperty, createProperty, toast, resetForm]);

  const handleCardClick = useCallback(async (property: Property) => {
    try {
      // Buscar dados completos do imóvel com description e images
      console.log("🔄 Carregando dados completos do imóvel:", property.id);
      
      const fullProperty = await propertyService.getById(property.id);
      
      if (fullProperty) {
        setEditingProperty(fullProperty);
        setFormData(prepareFormDataFromProperty(fullProperty));
        console.log("✅ Descrição carregada:", fullProperty.description);
      } else {
        // Fallback: usar dados da listagem
        setEditingProperty(property);
        setFormData(prepareFormDataFromProperty(property));
      }
      
      setIsDialogOpen(true);
      setIsViewMode(true);
      setIsEditMode(true);
    } catch (error) {
      console.error("❌ Erro ao carregar dados completos:", error);
      // Fallback: usar dados da listagem
      setEditingProperty(property);
      setFormData(prepareFormDataFromProperty(property));
      setIsDialogOpen(true);
      setIsViewMode(true);
      setIsEditMode(true);
    }
  }, [prepareFormDataFromProperty]);

  const handleEnableEdit = useCallback(() => {
    setIsViewMode(false);
  }, []);

  const confirmDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPropertyToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!propertyToDelete) return;

    try {
      await deleteProperty(propertyToDelete);
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
    }
  }, [propertyToDelete, deleteProperty]);

  const getStatusBadge = useCallback((status: string) => (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  ), []);

  const handleOpenDialog = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  const handleCloseDialog = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  }, [resetForm]);

  const tableRows = useMemo(() => 
    filteredProperties.map((property) => (
      <TableRow 
        key={property.id}
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => handleCardClick(property)}
      >
        <TableCell className="font-medium text-blue-600">
          {property.location}
        </TableCell>
        <TableCell>
          {property.complement || "-"}
        </TableCell>
        <TableCell>
          {property.rooms ? (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.rooms}</span>
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
        <TableCell>{formatCurrency(property.value || 0)}</TableCell>
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
    )), [filteredProperties, handleCardClick, getStatusBadge, confirmDelete]);

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
            <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de cadastro dos imóveis para locação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-3"
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Grade
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-1.5" />
                Lista
              </Button>
            </div>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <PropertyFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              locations={locations}
              selectedLocations={selectedLocations}
              handleLocationToggle={handleLocationToggle}
              setSelectedLocations={setSelectedLocations}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              totalCount={filteredProperties.length}
            />
          </CardContent>
        </Card>

        {viewMode === "grid" && (
          <ScrollReveal>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onCardClick={handleCardClick}
                  onDeleteClick={confirmDelete}
                />
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
                  {tableRows}
                </TableBody>
              </Table>
            </div>
          </ScrollReveal>
        )}

        <PropertyFormDialog
          open={isDialogOpen}
          onOpenChange={handleCloseDialog}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          isEditMode={isEditMode}
          locations={locations}
          handleNumberChange={handleNumberChange}
          handleImageUpload={handleImageUpload}
          removeImage={removeImage}
          isSubmitting={isLoading}
          viewOnly={isViewMode}
          onEdit={handleEnableEdit}
        />

        <PropertyDeleteAlert
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          onCancel={() => setPropertyToDelete(null)}
        />
      </div>
    </Layout>
  );
}