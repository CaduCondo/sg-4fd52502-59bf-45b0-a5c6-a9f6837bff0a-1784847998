import { useState, useEffect } from "react";
import { Property } from "@/types";
import type { SortOption } from "@/components/public/SortSelector";
import { propertyService } from "@/services";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Converte Json do Supabase para array de strings
 */
function processImages(imagesJson: any): string[] {
  if (!imagesJson) return [];
  if (Array.isArray(imagesJson)) return imagesJson.filter((url: any) => typeof url === "string");
  if (typeof imagesJson === "string") {
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed.filter((url: any) => typeof url === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Busca as imagens de um imóvel específico
 */
async function loadPropertyImages(propertyId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("images")
      .eq("id", propertyId)
      .single();

    if (error) {
      console.error(`❌ Erro ao carregar imagens do imóvel ${propertyId}:`, error);
      return [];
    }

    return processImages(data?.images);
  } catch (err) {
    console.error(`❌ Exceção ao carregar imagens do imóvel ${propertyId}:`, err);
    return [];
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

        console.log("🔄 [usePublicProperties] Carregando imóveis públicos (dados básicos)...");

        // 🔥 ETAPA 1: Carregar dados básicos SEM images (rápido, sem timeout)
        const data = await propertyService.getPublicProperties();

        // Atualizar cache
        cachedProperties = data;
        cacheTimestamp = now;

        console.log(`✅ [usePublicProperties] ${data.length} imóveis carregados (sem images)`);

        // Aplicar filtro de localização
        let filtered = data;
        if (location && location !== "all") {
          filtered = data.filter((prop: Property) => prop.locationId === location);
          console.log(`🔍 Filtrados por localização: ${filtered.length} imóveis`);
        }

        // Aplicar ordenação
        const sorted = applySorting(filtered, sort);

        // Atualizar estado com imóveis SEM images (lista aparece rapidamente)
        setProperties(sorted);
        setLoading(false);

        // 🔥 ETAPA 2: Carregar images progressivamente (um por vez)
        console.log("🖼️ [usePublicProperties] Iniciando carregamento progressivo de imagens...");
        
        for (let i = 0; i < sorted.length; i++) {
          const property = sorted[i];
          
          // Pular se não tem imagens
          if (!property.images || property.images.length === 0) continue;

          // Carregar imagens deste imóvel
          const images = await loadPropertyImages(property.id);
          
          if (images.length > 0) {
            console.log(`  ✅ Imóvel ${i + 1}/${sorted.length}: ${images.length} imagens carregadas`);
            
            // Atualizar APENAS este imóvel no estado
            setProperties(prevProperties => 
              prevProperties.map(p => 
                p.id === property.id 
                  ? { ...p, images, allImages: images }
                  : p
              )
            );
          }
        }

        console.log("✅ [usePublicProperties] Carregamento progressivo concluído!");

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