import { useState, useEffect } from "react";
import { Property } from "@/types";
import { cacheService } from "@/services/cacheService";
import { SortOption } from "@/components/public/SortSelector";

const CACHE_TTL = 60 * 60 * 1000; // 1 hora

interface Filters {
  location?: string;
  sort?: SortOption;
}

export function usePublicProperties(filters: Filters = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, [filters.location, filters.sort]);

  async function loadProperties() {
    const cacheKey = `public_properties_${filters.location || "all"}_${filters.sort || "newest"}`;
    
    // Tentar cache primeiro
    const cached = cacheService.get<Property[]>(cacheKey);
    if (cached) {
      setProperties(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.location) params.append("location", filters.location);
      
      // Lógica de ordenação
      switch (filters.sort) {
        case "price-asc":
          params.append("sort", "value");
          params.append("order", "asc");
          break;
        case "price-desc":
          params.append("sort", "value");
          params.append("order", "desc");
          break;
        case "area-desc":
          params.append("sort", "area");
          params.append("order", "desc");
          break;
        case "newest":
        default:
          params.append("sort", "created_at");
          params.append("order", "desc");
          break;
      }

      const response = await fetch(`/api/properties/available?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar imóveis disponíveis");
      }

      const data = await response.json();
      
      // Mapear campos do banco para frontend - COMPLETO
      const mappedProperties: Property[] = data.map((prop: any) => {
        // Extrair dados da localização
        const locationData = prop.locations || {};
        const city = locationData.city || "";
        const state = locationData.state || "";
        const neighborhood = locationData.neighborhood || "";
        const locationName = locationData.name || "";

        return {
          id: prop.id,
          locationId: prop.location_id,
          complement: prop.complement || "",
          
          // Informações do imóvel
          type: prop.property_type || "Outros",
          propertyIdentifier: prop.property_identifier || "",
          rooms: prop.bedrooms || 0, // bedrooms → rooms
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          
          // Valores
          value: prop.value || 0,
          garageValue: prop.garage_value || 0,
          
          // Características
          hasGarage: prop.has_garage || false,
          hasFurniture: prop.has_furniture || false,
          acceptsPets: prop.accepts_pets || false,
          
          // Textos
          description: prop.description || "",
          status: prop.status,
          images: Array.isArray(prop.images) ? prop.images : [],
          createdAt: prop.created_at,
          
          // Localização (string para compatibilidade)
          location: locationName || `${city} - ${state}`,
          
          // Localização (campos individuais)
          city: city,
          state: state,
          neighborhood: neighborhood,
          
          // Localização (objeto completo)
          locationDetails: locationData.id ? {
            id: locationData.id,
            name: locationName,
            address: locationData.address || "",
            city: city,
            state: state,
            zipCode: locationData.zip_code || "",
            neighborhood: neighborhood,
          } : undefined,
        };
      });

      setProperties(mappedProperties);
      
      // Cachear resultado
      cacheService.set(cacheKey, mappedProperties, CACHE_TTL);

    } catch (err: any) {
      console.error("Erro ao carregar imóveis públicos:", err);
      setError(err.message || "Erro ao carregar imóveis");
      
      // Tentar usar cache expirado como fallback
      const staleCache = cacheService.get<Property[]>(cacheKey, true);
      if (staleCache) {
        setProperties(staleCache);
        setError(null); // Limpa erro se conseguiu fallback
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    properties,
    loading,
    error,
    refresh: loadProperties,
  };
}