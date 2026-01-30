import { useState, useEffect, useCallback } from "react";
import { propertyService, locationService } from "@/services";
import type { Property, Location } from "@/types";
import { parseCurrencyToFloat, formatCurrency } from "@/lib/masks";
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

export function useProperties(): UsePropertiesReturn {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
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
      // Não mostrar toast de erro - pode ser simplesmente que não há dados ainda
    } finally {
      setLoading(false);
    }
  }, []);

  const filterProperties = useCallback(() => {
    let filtered = properties.filter((property) => {
      const matchesSearch =
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.complement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      
      const propertyLocationId = property.location_id || property.locationId;
      const matchesLocation = 
        selectedLocations.length === 0 || 
        (propertyLocationId && selectedLocations.includes(propertyLocationId));

      return matchesSearch && matchesStatus && matchesLocation;
    });

    if (sortOrder === "alphabetical") {
      filtered = filtered.sort((a, b) => (a.location || "").localeCompare(b.location || ""));
    } else if (sortOrder === "price-asc") {
      filtered = filtered.sort((a, b) => (a.value || 0) - (b.value || 0));
    } else if (sortOrder === "price-desc") {
      filtered = filtered.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, statusFilter, selectedLocations, sortOrder]);

  const handleLocationToggle = useCallback((locationId: string) => {
    setSelectedLocations((prev) => {
      if (prev.includes(locationId)) {
        return prev.filter((id) => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  }, []);

  const createProperty = useCallback(async (formData: PropertyFormData) => {
    if (!formData.location_id || formData.location_id.trim() === "") {
      throw new Error("Por favor, selecione um local");
    }

    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    
    if (!selectedLocation) {
      throw new Error("Local selecionado inválido. Por favor, selecione novamente.");
    }

    const parsedValue = parseCurrencyToFloat(formData.monthly_rent);

    const propertyData = {
      locationId: formData.location_id,
      location: selectedLocation?.name,
      propertyIdentifier: formData.property_identifier,
      complement: formData.complement,
      rooms: Number(formData.rooms) || 0,
      bathrooms: Number(formData.bathrooms) || 0,
      monthlyRent: parsedValue,
      value: parsedValue,
      description: formData.description,
      images: formData.images,
      hasFurniture: formData.hasFurniture,
      acceptsPets: formData.acceptsPets,
      area: formData.area ? parseFloat(formData.area.replace(",", ".")) : 0,
      hasGarage: formData.hasGarage,
    };

    const newProperty = await propertyService.create({
      ...propertyData,
      status: "available",
    });
    
    // CRÍTICO: Adicionar location_id ao objeto retornado para garantir que apareça no card
    const propertyWithLocation = {
      ...newProperty,
      locationId: formData.location_id,
      location_id: formData.location_id,
    };
    
    setProperties([propertyWithLocation, ...properties]);
  }, [locations, properties]);

  const updateProperty = useCallback(async (id: string, formData: PropertyFormData) => {
    if (!formData.location_id || formData.location_id.trim() === "") {
      throw new Error("Por favor, selecione um local");
    }

    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    
    if (!selectedLocation) {
      throw new Error("Local selecionado inválido. Por favor, selecione novamente.");
    }

    const parsedValue = parseCurrencyToFloat(formData.monthly_rent);

    const propertyData = {
      locationId: formData.location_id,
      location: selectedLocation.name,
      propertyIdentifier: formData.property_identifier || "Apartamento",
      complement: formData.complement || undefined,
      value: parsedValue,
      monthlyRent: parsedValue,
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
      console.log("🗑️ Iniciando deleção do imóvel:", id);
      
      // Remove imediatamente da UI para feedback visual rápido
      const propertyToDelete = properties.find(p => p.id === id);
      setProperties(prev => prev.filter(p => p.id !== id));
      
      // Deleta do banco de dados
      await propertyService.remove(id);
      
      console.log("✅ Imóvel deletado com sucesso do banco de dados");
      
      toast({
        title: "Sucesso!",
        description: "Imóvel deletado com sucesso.",
      });
      
    } catch (error: any) {
      console.error("❌ Erro ao deletar imóvel:", error);
      
      // Recarrega dados em caso de erro para sincronizar estado
      await loadData();
      
      const errorMessage = error?.message || "Não foi possível deletar o imóvel. Tente novamente.";
      
      toast({
        title: "Erro ao deletar",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [properties, loadData, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    filterProperties();
  }, [filterProperties]);

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