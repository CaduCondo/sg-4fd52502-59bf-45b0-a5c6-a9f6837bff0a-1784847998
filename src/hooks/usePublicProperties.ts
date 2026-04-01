import { useState, useEffect } from "react";
import { Property } from "@/types";
import { getPublicProperties } from "@/services/propertyService";
import type { SortOption } from "@/components/public/SortSelector";

interface UsePublicPropertiesOptions {
  location?: string;
  sort?: SortOption;
}

/**
 * Função para aplicar ordenação aos imóveis
 */
function applySorting(properties: Property[], sort?: SortOption): Property[] {
  if (!sort || sort === "newest") {
    return [...properties].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  switch (sort) {
    case "oldest":
      return [...properties].sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    
    case "price_asc":
    case "price-asc":
      return [...properties].sort((a, b) => (a.value || 0) - (b.value || 0));
    
    case "price_desc":
    case "price-desc":
      return [...properties].sort((a, b) => (b.value || 0) - (a.value || 0));
    
    case "area-asc":
      return [...properties].sort((a, b) => (a.area || 0) - (b.area || 0));
    
    case "area-desc":
      return [...properties].sort((a, b) => (b.area || 0) - (a.area || 0));
    
    default:
      return properties;
  }
}

export function usePublicProperties({ location, sort }: UsePublicPropertiesOptions) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        console.log("🔄 [usePublicProperties] Carregando imóveis públicos...");

        // Usar a nova função que carrega imagens
        const data = await getPublicProperties();

        console.log(`✅ [usePublicProperties] ${data.length} imóveis carregados`);

        // Aplicar filtro de localização se necessário
        let filtered = data;
        if (location && location !== "all") {
          filtered = data.filter((prop) => prop.locationId === location);
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