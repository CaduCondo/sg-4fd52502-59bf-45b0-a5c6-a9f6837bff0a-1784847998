import { useState, useEffect, useCallback } from "react";
import { propertyService, locationService } from "@/services";
import type { Property, Location } from "@/types";
import { parseCurrencyToFloat, formatCurrency } from "@/lib/masks";

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
  bedrooms: string;
  bathrooms: string;
  monthly_rent: string;
  status: string;
  description: string;
  images: string[];
  hasFurniture: boolean;
  acceptsPets: boolean;
}

export function useProperties(): UsePropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"alphabetical" | "price-asc" | "price-desc">("alphabetical");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PropertyFormData>({
    location_id: "",
    property_identifier: "",
    complement: "",
    bedrooms: "",
    bathrooms: "",
    monthly_rent: "",
    status: "available",
    description: "",
    images: [],
    hasFurniture: false,
    acceptsPets: false,
  });

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
      images: formData.images,
      hasFurniture: formData.hasFurniture,
      acceptsPets: formData.acceptsPets,
    };

    await propertyService.create(propertyData);
    await loadData();
  }, [locations, loadData]);

  const updateProperty = useCallback(async (id: string, formData: PropertyFormData) => {
    if (!formData.location_id || formData.location_id.trim() === "") {
      throw new Error("Por favor, selecione um local");
    }

    const selectedLocation = locations.find(loc => loc.id === formData.location_id);
    
    if (!selectedLocation) {
      throw new Error("Local selecionado inválido. Por favor, selecione novamente.");
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
      images: formData.images,
      hasFurniture: formData.hasFurniture,
      acceptsPets: formData.acceptsPets,
    };

    await propertyService.update(id, propertyData);
    await loadData();
  }, [locations, loadData]);

  const deleteProperty = useCallback(async (id: string) => {
    await propertyService.remove(id);
    await loadData();
  }, [loadData]);

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