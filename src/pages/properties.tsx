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

  // Handlers memoizados
  const handleNumberChange = useCallback((field: "rooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, "");
    const limitedValue = numbersOnly.slice(0, 2);
    setFormData(prev => ({ ...prev, [field]: limitedValue }));
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          newImages.push(reader.result as string);
          if (newImages.length === files.length) {
            setFormData((prev) => ({
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
    setFormData((prev) => ({
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

  const handleEdit = useCallback((property: Property) => {
    setEditingProperty(property);
    setFormData({
      location_id: property.locationId,
      property_identifier: property.propertyIdentifier || "",
      complement: property.complement || "",
      monthly_rent: formatCurrency(property.value || 0),
      status: property.status,
      description: property.description || "",
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      images: property.images || [],
      hasFurniture: property.hasFurniture || false,
      acceptsPets: property.acceptsPets || false,
      area: property.area?.toString() || "",
      hasGarage: property.hasGarage || false,
    });
    setIsDialogOpen(true);
  }, []);

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
      console.error("Erro ao salvar imóvel:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar o imóvel. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [editingProperty, formData, updateProperty, createProperty, toast, resetForm]);

  const handleCardClick = useCallback((property: Property) => {
    setEditingProperty(property);
    setFormData({
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
    });
    setIsDialogOpen(true);
    setIsViewMode(true);
    setIsEditMode(true);
  }, []);

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

  const getStatusBadge = useMemo(() => {
    return (status: string) => {
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
  }, []);

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
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollReveal>
        )}

        <PropertyFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
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