import { useState, useEffect, useRef } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface UsePublicPropertiesOptions {
  location?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "price-asc" | "price-desc" | "area-asc" | "area-desc";
}

// Limite inicial de imóveis para melhorar performance
const INITIAL_LIMIT = 50;

export function usePublicProperties(options: UsePublicPropertiesOptions = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadProperties();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [options?.location, options?.sort]);

  const loadProperties = async () => {
    if (fetchInProgressRef.current) {
      console.log("[usePublicProperties] ⏭️ Requisição já em andamento, ignorando...");
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);

    console.log("[usePublicProperties] 🚀 Iniciando busca otimizada...");
    const startTime = performance.now();

    try {
      // Query super otimizada - apenas campos essenciais
      let query = supabase
        .from("properties")
        .select(`
          id,
          location_id,
          complement,
          rooms,
          bathrooms,
          area,
          value,
          has_garage,
          has_furniture,
          accepts_pets,
          description,
          images,
          property_identifier,
          created_at,
          locations!properties_location_id_fkey (
            id,
            name,
            city,
            neighborhood
          )
        `)
        .eq("status", "available")
        .limit(INITIAL_LIMIT); // Limitar a 50 imóveis inicialmente

      // Aplicar filtro de localização se fornecido
      if (options.location && options.location !== "all") {
        query = query.eq("location_id", options.location);
      }

      // Aplicar ordenação
      const sortMap: Record<string, { column: string; ascending: boolean }> = {
        newest: { column: "created_at", ascending: false },
        oldest: { column: "created_at", ascending: true },
        "price-asc": { column: "value", ascending: true },
        "price-desc": { column: "value", ascending: false },
        price_asc: { column: "value", ascending: true },
        price_desc: { column: "value", ascending: false },
        "area-desc": { column: "area", ascending: false },
        area_desc: { column: "area", ascending: false },
      };

      const sortConfig = sortMap[options.sort || "newest"];
      if (sortConfig) {
        query = query.order(sortConfig.column, { ascending: sortConfig.ascending });
      }

      const { data, error: queryError } = await query;

      const totalTime = performance.now() - startTime;
      console.log(`[usePublicProperties] ✅ Query completada em ${totalTime.toFixed(0)}ms`);

      if (queryError) {
        console.error("[usePublicProperties] ❌ Erro na query:", queryError);
        throw queryError;
      }

      console.log(`[usePublicProperties] 📦 Recebidos ${data?.length || 0} imóveis`);

      // Transformação otimizada de dados
      const mappedProperties: Property[] = (data || []).map((prop: any) => {
        const location = prop.locations;
        return {
          id: prop.id,
          locationId: prop.location_id,
          location: location?.name || "",
          city: location?.city || "",
          neighborhood: location?.neighborhood || "",
          complement: prop.complement || "",
          rooms: prop.rooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          value: prop.value || 0,
          hasGarage: prop.has_garage || false,
          hasFurniture: prop.has_furniture || false,
          acceptsPets: prop.accepts_pets || false,
          description: prop.description || "",
          status: "available" as const,
          images: Array.isArray(prop.images) 
            ? (prop.images as any[]).map(img => String(img))
            : [],
          propertyIdentifier: prop.property_identifier || "",
          createdAt: prop.created_at || new Date().toISOString(),
          address: location?.address || "",
          features: [],
          locationDetails: location ? {
            id: location.id,
            name: location.name,
            city: location.city,
            neighborhood: location.neighborhood,
            state: "",
          } : undefined,
        };
      });

      setProperties(mappedProperties);
    } catch (err: any) {
      console.error("[usePublicProperties] ❌ ERRO", err);
      setError(err.message || "Erro ao carregar imóveis");
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  return {
    properties,
    loading,
    error,
    refresh: loadProperties,
  };
}