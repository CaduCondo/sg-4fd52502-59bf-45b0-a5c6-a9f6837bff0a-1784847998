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
    console.log("=== FETCHING PUBLIC PROPERTIES VIA EDGE FUNCTION (get-available-properties) ===");
    setIsLoading(true);
    setError(null);

    try {
      // Usar Edge Function em vez de RPC (bypassa PostgREST)
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('get-available-properties', {
        method: 'GET',
      });

      if (edgeFunctionError) {
        console.error("Edge Function Error:", edgeFunctionError);
        throw edgeFunctionError;
      }

      if (!data || !Array.isArray(data)) {
        console.warn("No properties returned from Edge Function");
        setProperties([]);
        setLocations([]);
        return;
      }

      console.log(`✅ Fetched ${data.length} available properties via Edge Function`);

      // Mapear dados para o formato Property
      const mappedProperties: Property[] = data.map((item: any) => ({
        id: item.id,
        locationId: item.location_id,
        location: item.location_name || "",
        complement: item.complement,
        description: item.description,
        rooms: item.rooms,
        bathrooms: item.bathrooms,
        area: item.area,
        hasGarage: item.has_garage,
        value: item.value,
        garageValue: item.garage_value,
        status: item.status as "available" | "occupied" | "unavailable",
        propertyIdentifier: item.property_identifier,
        images: Array.isArray(item.images) ? (item.images as string[]) : [],
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        
        // Location data flat
        address: undefined,
        number: undefined,
        neighborhood: item.location_neighborhood,
        city: item.location_city,
        state: item.location_state,
        zipCode: undefined,
      }));

      setProperties(mappedProperties);

      // Extrair locations (bairros/cidades) únicas para os filtros
      const uniqueLocations = Array.from(new Set(
        mappedProperties
          .map(p => p.neighborhood || p.city)
          .filter(Boolean) as string[]
      )).sort();
      
      setLocations(uniqueLocations);

    } catch (err) {
      console.error("Error fetching properties:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar imóveis");
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