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
    console.log("=== FETCHING PUBLIC PROPERTIES VIA RPC (get_available_properties) ===");
    setIsLoading(true);
    setError(null);

    try {
      // Usar RPC function otimizada
      const { data, error: rpcError } = await supabase.rpc("get_available_properties");

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw rpcError;
      }

      console.log(`✅ Fetched ${data?.length || 0} available properties via RPC`);

      // Mapear dados para o formato Property
      const mappedProperties: Property[] = (data || []).map((item: any) => ({
        id: item.id,
        locationId: item.location_id,
        location: item.location_name || "",
        complement: item.complement,
        description: item.description,
        type: item.type,
        rooms: item.rooms,
        bedrooms: item.rooms,
        bathrooms: item.bathrooms,
        area: item.area,
        hasGarage: item.has_garage,
        value: item.value,
        monthlyRent: item.monthly_rent,
        garageValue: item.garage_value,
        status: item.status as "available" | "occupied" | "unavailable",
        propertyIdentifier: item.property_identifier,
        images: Array.isArray(item.images) ? (item.images as string[]) : [],
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        createdAt: item.created_at,
        updatedAt: item.updated_at, // Nota: a RPC get_available_properties pode não retornar updated_at explicitamente na definition, verificar se necessário
        
        // Location data flat
        address: undefined, // RPC pública não retorna rua
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
          .map(p => p.neighborhood || p.city) // Prefere bairro, fallback cidade
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