import { useState, useEffect, useRef } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface UsePublicPropertiesOptions {
  location?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "price-asc" | "price-desc" | "area-asc" | "area-desc";
}

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
    const requestId = Date.now();
    
    if (fetchInProgressRef.current) {
      console.log("[usePublicProperties] ⏭️ Requisição já em andamento, ignorando...");
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);

    console.log("[usePublicProperties] 🚀 Iniciando busca...", { location: options.location, sort: options.sort });
    const startTime = performance.now();

    try {
      console.log("[usePublicProperties] 📡 Query ULTRA SIMPLES (apenas properties)...");
      const queryStartTime = performance.now();

      // Query ultra simples - APENAS properties, SEM JOIN
      let query = supabase
        .from("properties")
        .select(
          "id, location_id, complement, rooms, bathrooms, area, value, garage_value, has_garage, has_furniture, accepts_pets, description, status, images, property_identifier, created_at"
        )
        .eq("status", "available");

      const afterWhereTime = performance.now();
      console.log(`[usePublicProperties] ⏱️ Tempo até WHERE clause: ${(afterWhereTime - queryStartTime).toFixed(0)}ms`);

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

      const afterOrderTime = performance.now();
      console.log(`[usePublicProperties] ⏱️ Tempo até ORDER BY: ${(afterOrderTime - queryStartTime).toFixed(0)}ms`);

      console.log("[usePublicProperties] 🌐 Executando query no Supabase...");
      const beforeExecuteTime = performance.now();
      
      const { data, error: queryError } = await query;
      
      const afterExecuteTime = performance.now();
      const queryDuration = afterExecuteTime - queryStartTime;
      const executionDuration = afterExecuteTime - beforeExecuteTime;

      console.log(`[usePublicProperties] ⏱️ Tempo de EXECUÇÃO da query (await): ${executionDuration.toFixed(0)}ms`);
      console.log(`[usePublicProperties] ⏱️ Tempo TOTAL da query: ${queryDuration.toFixed(0)}ms`);

      if (queryError) {
        console.error("[usePublicProperties] ❌ Erro na query:", queryError);
        throw queryError;
      }

      console.log(`[usePublicProperties] ✅ Query completada em ${queryDuration.toFixed(0)}ms`);
      console.log(`[usePublicProperties] 📦 Recebidos ${data?.length || 0} imóveis. Mapeando...`);

      const mapStartTime = performance.now();

      const mappedProperties: Property[] = (data || []).map((prop: any) => ({
        id: prop.id,
        locationId: prop.location_id,
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
        status: "available" as const,
        images: Array.isArray(prop.images) 
          ? (prop.images as any[]).map(img => String(img))
          : [],
        propertyIdentifier: prop.property_identifier || "",
        createdAt: prop.created_at || new Date().toISOString(),
      }));

      const mapEndTime = performance.now();
      const mapDuration = mapEndTime - mapStartTime;

      console.log(`[usePublicProperties] ✅ Mapeamento completado em ${mapDuration.toFixed(0)}ms`);

      const totalTime = performance.now() - startTime;
      console.log(`[usePublicProperties] 🎉 TOTAL: ${totalTime.toFixed(0)}ms (${mappedProperties.length} imóveis)`);
      console.log(`[usePublicProperties] 📊 BREAKDOWN:`);
      console.log(`   - Setup query: ${(beforeExecuteTime - queryStartTime).toFixed(0)}ms`);
      console.log(`   - Execução Supabase: ${executionDuration.toFixed(0)}ms  ← GARGALO AQUI?`);
      console.log(`   - Mapeamento JS: ${mapDuration.toFixed(0)}ms`);
      console.log(`   - Overhead React: ${(totalTime - queryDuration - mapDuration).toFixed(0)}ms`);

      setProperties(mappedProperties);
    } catch (err: any) {
      const errorTime = performance.now() - startTime;
      console.error(`[usePublicProperties] ❌ ERRO após ${errorTime.toFixed(0)}ms`, err);
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