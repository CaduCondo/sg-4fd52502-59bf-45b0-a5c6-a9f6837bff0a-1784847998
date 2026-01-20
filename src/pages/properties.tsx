import { useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Bed, Bath, Trash2 } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { formatCurrency } from "@/lib/masks";
import type { Property } from "@/types";
import { useProperties, type PropertyFormData } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFilters } from "@/components/properties/PropertyFilters";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import { PropertyDeleteAlert } from "@/components/properties/PropertyDeleteAlert";
import { Badge } from "@/components/ui/badge";

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<PropertyFormData>({
    location_id: "",
    property_identifier: "Apartamento",
    complement: "",
    monthly_rent: "",
    status: "available",
    description: "",
    bedrooms: "",
    bathrooms: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, formData);
      } else {
        await createProperty(formData);
      }

      setIsDialogOpen(false);
      setIsEditMode(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      alert(error instanceof Error ? error.message : "Erro ao salvar imóvel. Por favor, verifique os dados e tente novamente.");
    }
  };

  const handleCardClick = (property: Property) => {
    setEditingProperty(property);
    
    const locationId = property.locationId || "";
    
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
          editingProperty={editingProperty}
          isEditMode={isEditMode}
          formData={formData}
          setFormData={setFormData}
          locations={locations}
          onSubmit={handleSubmit}
          onEnableEdit={handleEnableEdit}
          onReset={resetForm}
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