import { useState, useEffect } from "react";
import { Property } from "@/types";
import { cacheService } from "@/services/cacheService";

const CACHE_TTL = 60 * 60 * 1000; // 1 hora (imóveis públicos mudam pouco)

interface Filters {
  location?: string;
  sort?: "asc" | "desc";
}

export function usePublicProperties(filters: Filters = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, [filters.location, filters.sort]);

  async function loadProperties() {
    const cacheKey = `public_properties_${filters.location || "all"}_${filters.sort || "desc"}`;
    
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
      // Usar API otimizada em vez de query direta
      const params = new URLSearchParams();
      if (filters.location) params.append("location", filters.location);
      if (filters.sort) params.append("sort", filters.sort);

      const response = await fetch(`/api/properties/available?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar imóveis disponíveis");
      }

      const data = await response.json();
      
      // Mapear campos do banco para frontend
      const mappedProperties: Property[] = data.map((prop: any) => ({
        id: prop.id,
        locationId: prop.location_id,
        complement: prop.complement,
        type: prop.type,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        area: prop.area,
        value: prop.value,
        description: prop.description,
        status: prop.status,
        images: prop.images || [],
        createdAt: prop.created_at,
        // Campos relacionados
        location: prop.locations ? {
          id: prop.locations.id,
          name: prop.locations.name,
          address: prop.locations.address,
          city: prop.locations.city,
          state: prop.locations.state,
          zipCode: prop.locations.zip_code,
        } : undefined,
      }));

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