import { useState, useEffect, useRef } from "react";
import { Property } from "@/types";
import { SortOption } from "@/components/public/SortSelector";

interface Filters {
  location?: string;
  sort?: SortOption;
}

// Cache simples em memória para evitar requests desnecessárias
const cache = new Map<string, { data: Property[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function usePublicProperties(filters: Filters = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    loadProperties();
    
    return () => {
      // Cancelar requisição ao desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filters.location, filters.sort]);

  async function loadProperties() {
    // Criar chave de cache baseada nos filtros
    const cacheKey = JSON.stringify(filters);
    
    // Verificar cache primeiro
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setProperties(cached.data);
      setLoading(false);
      return;
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();

    // Só mostrar loading se for primeira carga ou não tiver cache
    if (isFirstLoad.current || !cached) {
      setLoading(true);
    }
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

      const response = await fetch(`/api/properties/available?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error("Erro ao carregar imóveis disponíveis");
      }

      const data = await response.json();
      
      // Mapear campos do banco para frontend
      const mappedProperties: Property[] = (data || []).map((prop: any) => {
        const locationData = prop.locations || {};
        const city = locationData.city || "";
        const state = locationData.state || "";
        const neighborhood = locationData.neighborhood || "";
        const locationName = locationData.name || "";

        return {
          id: prop.id,
          locationId: prop.location_id,
          complement: prop.complement || "",
          
          type: prop.property_type || "Outros",
          propertyIdentifier: prop.property_identifier || "",
          rooms: prop.bedrooms || 0,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          
          value: prop.value || 0,
          garageValue: prop.garage_value || 0,
          
          hasGarage: prop.has_garage || false,
          hasFurniture: prop.has_furniture || false,
          acceptsPets: prop.accepts_pets || false,
          
          description: prop.description || "",
          status: prop.status,
          images: Array.isArray(prop.images) ? prop.images : [],
          createdAt: prop.created_at,
          
          location: locationName || `${city} - ${state}`,
          
          city: city,
          state: state,
          neighborhood: neighborhood,
          
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
      
      // Atualizar cache
      cache.set(cacheKey, {
        data: mappedProperties,
        timestamp: Date.now(),
      });

      isFirstLoad.current = false;

    } catch (err: any) {
      // Ignorar erros de abort
      if (err.name === "AbortError") {
        return;
      }
      
      console.error("Erro ao carregar imóveis públicos:", err);
      setError(err.message || "Erro ao carregar imóveis");
      
      // Se tiver cache antigo, usar ele
      if (cached) {
        setProperties(cached.data);
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