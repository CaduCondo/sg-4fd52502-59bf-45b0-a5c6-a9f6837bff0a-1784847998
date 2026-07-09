import { useState, useEffect } from "react";
import { Property } from "@/types";
import type { SortOption } from "@/components/public/SortSelector";

interface UsePublicPropertiesOptions {
  location?: string;
  sort?: SortOption;
}

/**
 * Função para aplicar ordenação aos imóveis
 */
function applySorting(properties: Property[], sort?: SortOption): Property[] {
  // Ordenação aleatória (embaralhar array)
  if (sort === "random") {
    const shuffled = [...properties];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Mais recentes (padrão se não especificado)
  if (!sort || sort === "newest") {
    return [...properties].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  switch (sort) {
    case "price-asc":
      return [...properties].sort((a, b) => (a.value || 0) - (b.value || 0));
    
    case "price-desc":
      return [...properties].sort((a, b) => (b.value || 0) - (a.value || 0));
    
    case "area-desc":
      return [...properties].sort((a, b) => (b.area || 0) - (a.area || 0));
    
    default:
      return properties;
  }
}

// Cache em memória para evitar requisições repetidas
let cachedProperties: Property[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function usePublicProperties({ location, sort }: UsePublicPropertiesOptions) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        const now = Date.now();
        
        // Usar cache se válido
        if (cachedProperties && (now - cacheTimestamp) < CACHE_DURATION) {
          console.log("✅ [usePublicProperties] Usando cache em memória");
          
          // Aplicar filtro de localização
          let filtered = cachedProperties;
          if (location && location !== "all") {
            filtered = cachedProperties.filter((prop) => prop.locationId === location);
          }

          // Aplicar ordenação
          const sorted = applySorting(filtered, sort);
          setProperties(sorted);
          setLoading(false);
          return;
        }

        console.log("🔄 [usePublicProperties] Carregando imóveis públicos via API...");

        // 🔥 CORREÇÃO: Usar API route em vez de query direta no Supabase
        const response = await fetch("/api/properties/available");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Atualizar cache
        cachedProperties = data;
        cacheTimestamp = now;

        console.log(`✅ [usePublicProperties] ${data.length} imóveis carregados`);

        // Aplicar filtro de localização
        let filtered = data;
        if (location && location !== "all") {
          filtered = data.filter((prop: Property) => prop.locationId === location);
          console.log(`🔍 Filtrados por localização: ${filtered.length} imóveis`);
        }

        // Aplicar ordenação
        const sorted = applySorting(filtered, sort);

        setProperties(sorted);
      } catch (err) {
        console.error("❌ [usePublicProperties] Erro ao carregar imóveis:", err);
        setError("Não foi possível carregar os imóveis. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [location, sort]);

  return { properties, loading, error };
}