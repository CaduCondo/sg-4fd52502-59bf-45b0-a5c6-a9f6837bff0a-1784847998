import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/types";

export type PublicProperty = Property;

interface UsePublicPropertiesReturn {
  properties: Property[];
  locations: string[]; // Cidades/Bairros únicos para filtro
  isLoading: boolean;
  error: string | null;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: "newest" | "price-asc" | "price-desc" | "area-desc";
  setSortBy: (sort: "newest" | "price-asc" | "price-desc" | "area-desc") => void;
}

export function usePublicProperties(): UsePublicPropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "area-desc">("newest");

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    console.log("=== FETCHING PUBLIC PROPERTIES VIA NEXT.JS API ===");
    setIsLoading(true);
    setError(null);

    try {
      // Usar a rota PÚBLICA /api/properties/available em vez de /api/properties
      const response = await fetch("/api/properties/available");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const fetchedProperties = result.data || [];

      console.log(`✅ Fetched ${fetchedProperties.length} available properties via Next.js API Route`);

      setProperties(fetchedProperties);
      // setFilteredProperties removido pois é derivado
    } catch (err: any) {
      console.error("Error fetching public properties:", err);
      setError(err.message || "Erro ao carregar imóveis");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar properties baseado nos filtros selecionados
  const filteredProperties = properties.filter((property) => {
    const matchesCity = !selectedCity || property.city === selectedCity;
    // O filtro "selectedLocation" aqui geralmente se refere ao Location ID (prédio) ou Bairro? 
    // Na implementação anterior parecia ser ID. Mas na Home pública geralmente é Bairro.
    // O hook anterior usava locationId. Vamos manter consistente.
    const matchesLocation = !selectedLocation || property.locationId === selectedLocation;
    
    const matchesSearch = !searchTerm || 
      property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCity && matchesLocation && matchesSearch;
  });

  // Ordenar properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "price-asc":
        return (a.value || 0) - (b.value || 0);
      case "price-desc":
        return (b.value || 0) - (a.value || 0);
      case "area-desc":
        return (b.area || 0) - (a.area || 0);
      default:
        return 0;
    }
  });

  return {
    properties: sortedProperties,
    locations, // Lista de strings para dropdown de filtro
    isLoading,
    error,
    selectedCity,
    setSelectedCity,
    selectedLocation,
    setSelectedLocation,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
  };
}