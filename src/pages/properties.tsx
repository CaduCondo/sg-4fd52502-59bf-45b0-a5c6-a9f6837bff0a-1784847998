import { useState, useCallback, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SortableTable } from "@/components/ui/sortable-table";
import { Building, Plus, LayoutGrid, List, Bed, Bath, Trash2, Camera } from "lucide-react";
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

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedAndFilteredProperties = useMemo(() => {
    let result = [...filteredProperties];
    if (sortKey) {
      result.sort((a, b) => {
        let aVal: any = "";
        let bVal: any = "";
        switch (sortKey) {
          case "local": aVal = a.location || ""; bVal = b.location || ""; break;
          case "complement": aVal = a.complement || ""; bVal = b.complement || ""; break;
          case "value": aVal = a.value || 0; bVal = b.value || 0; break;
          case "rooms": aVal = Number(a.rooms) || 0; bVal = Number(b.rooms) || 0; break;
          case "bathrooms": aVal = Number(a.bathrooms) || 0; bVal = Number(b.bathrooms) || 0; break;
          case "area": aVal = Number(a.area) || 0; bVal = Number(b.area) || 0; break;
          case "status": aVal = a.status || ""; bVal = b.status || ""; break;
          case "foto": aVal = a.images?.length || 0; bVal = b.images?.length || 0; break;
        }
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredProperties, sortKey, sortDirection]);

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

  const propertyColumns = useMemo(() => [
    { key: "local", label: "Local", render: (p: Property) => <span className="font-medium text-blue-600">{p.location}</span> },
    { key: "complement", label: "Complemento", render: (p: Property) => p.complement || "-" },
    { key: "value", label: "Valor", render: (p: Property) => formatCurrency(p.value || 0) },
    { key: "rooms", label: "Quartos", render: (p: Property) => p.rooms ? <div className="flex items-center gap-1"><Bed className="h-4 w-4" /><span>{p.rooms}</span></div> : "-" },
    { key: "bathrooms", label: "Banheiros", render: (p: Property) => p.bathrooms ? <div className="flex items-center gap-1"><Bath className="h-4 w-4" /><span>{p.bathrooms}</span></div> : "-" },
    { key: "area", label: "Área Útil", render: (p: Property) => p.area ? `${p.area} m²` : "-" },
    { key: "status", label: "Status", render: (p: Property) => getStatusBadge(p.status) },
    { key: "foto", label: "Foto", render: (p: Property) => p.images && p.images.length > 0 ? <div className="flex items-center gap-1 text-blue-600"><Camera className="h-4 w-4" /><span className="text-xs font-medium">{p.images.length}</span></div> : <span className="text-muted-foreground text-xs">-</span> },
    { key: "actions", label: "Deletar", sortable: false, className: "text-right", render: (p: Property) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={(e) => confirmDelete(e, p.id)}
        title="Excluir"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </Button>
    )}
  ], [getStatusBadge, confirmDelete]);

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
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de cadastro dos imóveis para locação.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-2 sm:px-3"
              >
                <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Grade</span>
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-2 sm:px-3"
              >
                <List className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
            </div>
            <Button onClick={handleOpenDialog} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Novo Imóvel</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        <Card className="w-full">
          <CardContent className="pt-6 px-3 sm:px-6">
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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
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
            <div className="w-full overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-3 sm:px-0">
                <SortableTable
                  data={sortedAndFilteredProperties}
                  columns={propertyColumns}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onRowClick={handleCardClick}
                  emptyMessage="Nenhum imóvel encontrado com os filtros aplicados."
                />
              </div>
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