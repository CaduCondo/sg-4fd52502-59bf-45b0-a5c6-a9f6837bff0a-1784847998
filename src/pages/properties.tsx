import { useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Bed, Bath, Trash2 } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { formatCurrency, parseCurrencyToFloat } from "@/lib/masks";
import type { Property } from "@/types";
import { useProperties, type PropertyFormData } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFilters } from "@/components/properties/PropertyFilters";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import { PropertyDeleteAlert } from "@/components/properties/PropertyDeleteAlert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function PropertiesPage() {
  const router = useRouter();
  const {
    properties,
    locations,
    filteredProperties,
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
    loadData,
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

  const [formData, setFormData] = useState<PropertyFormData>({
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
  });

  const handleNumberChange = (field: "rooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, "");
    const limitedValue = numbersOnly.slice(0, 2);
    setFormData({ ...formData, [field]: limitedValue });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleEdit = (property: Property) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const propertyData: PropertyFormData = {
        location_id: formData.location_id,
        property_identifier: formData.property_identifier || "Apartamento",
        complement: formData.complement || "",
        monthly_rent: formData.monthly_rent,
        status: formData.status,
        description: formData.description || "",
        rooms: formData.rooms || "0",
        bathrooms: formData.bathrooms || "0",
        images: formData.images,
        hasFurniture: formData.hasFurniture,
        acceptsPets: formData.acceptsPets,
        area: formData.area,
        hasGarage: formData.hasGarage,
      };

      if (editingProperty) {
        await updateProperty(editingProperty.id, propertyData);
        toast({
          title: "Imóvel atualizado com sucesso",
          variant: "default",
        });
      } else {
        await createProperty(propertyData);
        toast({
          title: "Imóvel cadastrado com sucesso",
          variant: "default",
        });
      }

      await loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast({
        title: "Erro ao salvar imóvel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (property: Property) => {
    setFormData({
      location_id: property.locationId || "",
      property_identifier: property.propertyIdentifier || "",
      complement: property.complement || "",
      rooms: property.rooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      monthly_rent: property.value?.toString() || "",
      description: property.description || "",
      status: property.status || "available",
      images: property.images || [],
      hasFurniture: property.has_furniture || false,
      acceptsPets: property.accepts_pets || false,
      area: property.area?.toString() || "",
      hasGarage: property.hasGarage || false,
    });
    
    setEditingProperty(property);
    setIsEditMode(true);
    setIsViewMode(true);
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
      await deleteProperty(propertyToDelete);
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
    }
  };

  const resetForm = () => {
    setFormData({
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
    });
    setEditingProperty(null);
    setIsEditMode(false);
    setIsViewMode(false);
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
              Gerenciamento de cadastro dos imóveis para locação.
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
              viewMode={viewMode}
              setViewMode={setViewMode}
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

        <PropertyFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
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
          onEdit={() => setIsViewMode(false)}
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