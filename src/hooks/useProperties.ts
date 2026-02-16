import { useState, useEffect, useCallback, useMemo } from "react";
import { propertyService, locationService } from "@/services";
import type { Property, Location } from "@/types";
import { parseCurrencyToFloat } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";

interface UsePropertiesReturn {
  properties: Property[];
  locations: Location[];
  filteredProperties: Property[];
  loading: boolean;
  searchTerm: string;
  statusFilter: string;
  selectedLocations: string[];
  sortOrder: "alphabetical" | "price-asc" | "price-desc";
  viewMode: "grid" | "table";
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedLocations: (locations: string[]) => void;
  setSortOrder: (order: "alphabetical" | "price-asc" | "price-desc") => void;
  setViewMode: (mode: "grid" | "table") => void;
  handleLocationToggle: (locationId: string) => void;
  loadData: () => Promise<void>;
  createProperty: (data: PropertyFormData) => Promise<void>;
  updateProperty: (id: string, data: PropertyFormData) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
}

export interface PropertyFormData {
  location_id: string;
  property_identifier: string;
  complement: string;
  rooms: string;
  bathrooms: string;
  monthly_rent: string;
  description: string;
  status: string;
  images: string[];
  hasFurniture: boolean;
  acceptsPets: boolean;
  area?: string;
  hasGarage: boolean;
}

const SORT_FUNCTIONS = {
  alphabetical: (a: Property, b: Property) => (a.location || "").localeCompare(b.location || ""),
  "price-asc": (a: Property, b: Property) => (a.value || 0) - (b.value || 0),
  "price-desc": (a: Property, b: Property) => (b.value || 0) - (a.value || 0),
};

export function useProperties(): UsePropertiesReturn {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"alphabetical" | "price-asc" | "price-desc">("alphabetical");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
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
  }, []);

  const filteredProperties = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    let filtered = properties.filter((property) => {
      const matchesSearch = !searchTerm || 
        property.location?.toLowerCase().includes(searchLower) ||
        property.complement?.toLowerCase().includes(searchLower) ||
        property.description?.toLowerCase().includes(searchLower) ||
        property.propertyIdentifier?.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      
      const propertyLocationId = property.location_id || property.locationId;
      const matchesLocation = selectedLocations.length === 0 || 
        (propertyLocationId && selectedLocations.includes(propertyLocationId));

      return matchesSearch && matchesStatus && matchesLocation;
    });

    const sortFn = SORT_FUNCTIONS[sortOrder];
    if (sortFn) {
      filtered = [...filtered].sort(sortFn);
    }

    return filtered;
  }, [properties, searchTerm, statusFilter, selectedLocations, sortOrder]);

  const handleLocationToggle = useCallback((locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  }, []);

  const createProperty = useCallback(async (formData: PropertyFormData) => {
    if (!formData.location_id?.trim()) {
      throw new Error("Por favor, selecione um local");
    }

    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    if (!selectedLocation) {
      throw new Error("Local selecionado inválido. Por favor, selecione novamente.");
    }

    const propertyData: Omit<Property, "id" | "createdAt" | "updatedAt"> = {
      locationId: formData.location_id,
      location: selectedLocation.name,
      propertyIdentifier: formData.property_identifier,
      complement: formData.complement,
      rooms: Number(formData.rooms) || 0,
      bathrooms: Number(formData.bathrooms) || 0,
      value: parseCurrencyToFloat(formData.monthly_rent),
      description: formData.description,
      images: formData.images,
      hasFurniture: formData.hasFurniture,
      acceptsPets: formData.acceptsPets,
      area: formData.area ? parseFloat(formData.area.replace(",", ".")) : 0,
      hasGarage: formData.hasGarage,
      status: formData.status as "available" | "occupied" | "unavailable",
      address: "", // Added missing property
      features: [], // Added missing property
    };

    const createdProperty = await propertyService.create(propertyData);
    setProperties(prev => [createdProperty, ...prev]);
  }, [locations]);

  const updateProperty = useCallback(async (id: string, formData: PropertyFormData) => {
    if (!formData.location_id?.trim()) {
      throw new Error("Por favor, selecione um local");
    }

    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    if (!selectedLocation) {
      throw new Error("Local selecionado inválido. Por favor, selecione novamente.");
    }

    const propertyData: Partial<Property> = {
      locationId: formData.location_id,
      location: selectedLocation.name,
      propertyIdentifier: formData.property_identifier || "Apartamento",
      complement: formData.complement || undefined,
      value: parseCurrencyToFloat(formData.monthly_rent),
      status: formData.status as "available" | "occupied" | "unavailable",
      description: formData.description,
      rooms: formData.rooms ? parseInt(formData.rooms) : undefined,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      images: formData.images,
      hasFurniture: formData.hasFurniture,
      acceptsPets: formData.acceptsPets,
      area: formData.area ? parseFloat(formData.area.replace(",", ".")) : 0,
      hasGarage: formData.hasGarage,
    };

    await propertyService.update(id, propertyData);
    await loadData();
  }, [locations, loadData]);

  const deleteProperty = useCallback(async (id: string) => {
    try {
      setProperties(prev => prev.filter(p => p.id !== id));
      await propertyService.remove(id);
      
      toast({
        title: "Sucesso!",
        description: "Imóvel deletado com sucesso.",
      });
    } catch (error: any) {
      await loadData();
      
      toast({
        title: "Erro ao deletar",
        description: error?.message || "Não foi possível deletar o imóvel. Tente novamente.",
        variant: "destructive",
      });
      
      throw error;
    }
  }, [loadData, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
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
  };
}