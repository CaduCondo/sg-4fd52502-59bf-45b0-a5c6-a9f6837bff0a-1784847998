import { useState, useEffect, useRef } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export function usePublicProperties(options?: { location?: string; sort?: string }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para evitar múltiplas chamadas simultâneas
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    loadProperties();
    
    // Cleanup: cancelar ao desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [options?.location, options?.sort]);

  const loadProperties = async () => {
    // Evitar múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      console.log("[usePublicProperties] ⏭️ Requisição já em andamento, ignorando...");
      return;
    }

    const startTime = performance.now();
    console.log("[usePublicProperties] 🚀 Iniciando busca...", { location: options?.location, sort: options?.sort });

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // Criar novo AbortController
      abortControllerRef.current = new AbortController();

      console.log("[usePublicProperties] 📡 Fazendo query no Supabase...");
      const queryStart = performance.now();
      
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
          garage_value,
          has_garage,
          has_furniture,
          accepts_pets,
          description,
          status,
          images,
          property_identifier,
          created_at,
          locations!inner (
            id,
            name,
            city,
            neighborhood,
            state,
            street,
            zip_code
          )
        `)
        .eq("status", "available");

      // Aplicar filtros opcionais
      if (options?.location) {
        query = query.eq("location_id", options.location);
      }

      // Aplicar ordenação
      if (options?.sort === "price-asc") {
        query = query.order("value", { ascending: true });
      } else if (options?.sort === "price-desc") {
        query = query.order("value", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error: fetchError } = await query;

      const queryEnd = performance.now();
      console.log(`[usePublicProperties] ✅ Query completada em ${(queryEnd - queryStart).toFixed(0)}ms`);

      if (fetchError) {
        console.error("[usePublicProperties] ❌ Erro na query:", fetchError);
        throw fetchError;
      }

      if (!data || data.length === 0) {
        console.warn("[usePublicProperties] ⚠️ Nenhum imóvel encontrado");
        setProperties([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      console.log(`[usePublicProperties] 📦 Recebidos ${data.length} imóveis. Mapeando dados...`);
      const mapStart = performance.now();

      const mappedProperties: Property[] = data.map((prop: any) => {
        const locationData = Array.isArray(prop.locations) ? prop.locations[0] : prop.locations;
        const locationName = locationData?.name || "";

        return {
          id: prop.id,
          locationId: prop.location_id,
          complement: prop.complement || "",
          rooms: prop.rooms || 0,
          bedrooms: prop.rooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          value: prop.value || 0,
          garageValue: prop.garage_value || 0,
          hasGarage: prop.has_garage || false,
          hasFurniture: prop.has_furniture || false,
          acceptsPets: prop.accepts_pets || false,
          description: prop.description || "",
          status: prop.status || "available",
          images: Array.isArray(prop.images) ? prop.images : [],
          propertyIdentifier: prop.property_identifier || "",
          type: "Apartamento",
          createdAt: prop.created_at,
          location: locationName,
          locationDetails: locationData ? {
            id: locationData.id,
            name: locationData.name,
            city: locationData.city || "",
            neighborhood: locationData.neighborhood || "",
            state: locationData.state || "",
            address: locationData.street || "",
            zipCode: locationData.zip_code || ""
          } : undefined,
        };
      });

      const mapEnd = performance.now();
      console.log(`[usePublicProperties] ✅ Mapeamento completado em ${(mapEnd - mapStart).toFixed(0)}ms`);

      const totalTime = performance.now() - startTime;
      console.log(`[usePublicProperties] 🎉 TOTAL: ${totalTime.toFixed(0)}ms (${mappedProperties.length} imóveis)`);

      setProperties(mappedProperties);
      setError(null);
    } catch (err: any) {
      // Ignorar erros de abort
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log("[usePublicProperties] 🛑 Requisição cancelada (normal)");
        return;
      }

      const errorTime = performance.now() - startTime;
      console.error(`[usePublicProperties] ❌ ERRO após ${errorTime.toFixed(0)}ms:`, err);
      setError(err?.message || "Erro ao carregar imóveis");
      setProperties([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  return {
    properties,
    loading,
    error,
    refresh: loadProperties,
  };
}