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
      // Mapear SortOption para parâmetros de API
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

      // Usar a rota genérica otimizada em vez de available direta se precisarmos de mais flexibilidade
      // Mas por enquanto, available.ts parece ser o endpoint correto
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
        type: prop.type || "Outros", // Fallback se não existir
        bedrooms: prop.bedrooms || 0,
        bathrooms: prop.bathrooms || 0,
        area: prop.area || 0,
        value: prop.value || 0,
        description: prop.description || "",
        status: prop.status,
        images: Array.isArray(prop.images) ? prop.images : [],
        createdAt: prop.created_at,
        // Campos relacionados
        location: prop.locations?.name || "Localização não informada", // String para compatibilidade
        locationDetails: prop.locations ? {
          id: prop.locations.id,
          name: prop.locations.name || "",
          address: prop.locations.address || "",
          city: prop.locations.city || "",
          state: prop.locations.state || "",
          zipCode: prop.locations.zip_code || "",
          neighborhood: prop.locations.neighborhood || "",
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