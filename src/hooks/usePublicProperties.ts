import { useState, useEffect, useRef } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface UsePublicPropertiesOptions {
  location?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "price-asc" | "price-desc" | "area-asc" | "area-desc";
}

export function usePublicProperties(options?: UsePublicPropertiesOptions) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
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
    console.log("[usePublicProperties] 🚀 Iniciando busca...", { 
      location: options?.location || '', 
      sort: options?.sort || 'newest' 
    });

    if (isLoadingRef.current) {
      console.log("[usePublicProperties] ⏭️ Requisição já em andamento, ignorando...");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      console.log("[usePublicProperties] 📡 Query ULTRA SIMPLES (apenas properties)...");

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
          created_at
        `)
        .eq("status", "available");

      if (options?.location) {
        query = query.eq("location_id", options.location);
      }

      const sortOption = options?.sort || "newest";
      if (sortOption === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortOption === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (sortOption === "price_asc" || sortOption === "price-asc") {
        query = query.order("value", { ascending: true });
      } else if (sortOption === "price_desc" || sortOption === "price-desc") {
        query = query.order("value", { ascending: false });
      } else if (sortOption === "area-asc") {
        query = query.order("area", { ascending: true });
      } else if (sortOption === "area-desc") {
        query = query.order("area", { ascending: false });
      }

      const { data, error: queryError } = await query;

      const queryTime = performance.now() - startTime;
      console.log(`[usePublicProperties] ✅ Query completada em ${queryTime.toFixed(0)}ms`);

      if (queryError) {
        console.error("[usePublicProperties] ❌ Erro na query:", queryError);
        throw queryError;
      }

      if (!data) {
        console.warn("[usePublicProperties] ⚠️ Nenhum dado retornado");
        setProperties([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      console.log(`[usePublicProperties] 📦 Recebidos ${data.length} imóveis. Mapeando...`);
      const mapStartTime = performance.now();

      const mappedProperties: Property[] = data.map((prop) => ({
        id: prop.id,
        locationId: prop.location_id || "",
        location: "", // Não precisa na home
        complement: prop.complement || "",
        rooms: prop.rooms || 0,
        bathrooms: prop.bathrooms || 0,
        area: prop.area || 0,
        value: prop.value || 0,
        garageValue: prop.garage_value || 0,
        hasGarage: prop.has_garage || false,
        hasFurniture: prop.has_furniture || false,
        acceptsPets: prop.accepts_pets || false,
        description: prop.description || "",
        status: (prop.status as Property["status"]) || "available",
        images: Array.isArray(prop.images) ? (prop.images as string[]) : [],
        propertyIdentifier: prop.property_identifier || "",
        createdAt: prop.created_at || new Date().toISOString(),
        locationDetails: undefined, // Não precisa na home
      }));

      const mapTime = performance.now() - mapStartTime;
      const totalTime = performance.now() - startTime;

      console.log(`[usePublicProperties] ✅ Mapeamento completado em ${mapTime.toFixed(0)}ms`);
      console.log(`[usePublicProperties] 🎉 TOTAL: ${totalTime.toFixed(0)}ms (${mappedProperties.length} imóveis)`);

      setProperties(mappedProperties);
      setError(null);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[usePublicProperties] 🛑 Requisição cancelada (normal)");
        return;
      }

      const errorTime = performance.now();
      console.error("[usePublicProperties] ❌ ERRO após", errorTime.toFixed(0) + "ms:", err);
      
      setError(err.message || "Erro ao carregar imóveis");
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