import { useState, useEffect } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export function usePublicProperties(options?: { location?: string; sort?: string }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, [options?.location, options?.sort]);

  const loadProperties = async () => {
    const startTime = performance.now();
    console.log("[usePublicProperties] 🚀 Iniciando busca...");

    try {
      setLoading(true);
      setError(null);

      // Query DIRETA e OTIMIZADA - busca apenas campos necessários
      console.log("[usePublicProperties] 📡 Fazendo query no Supabase...");
      const queryStart = performance.now();
      
      const { data, error: fetchError } = await supabase
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
            street,
            number,
            neighborhood,
            city,
            state,
            zip_code
          )
        `)
        .eq("status", "available")
        .order("created_at", { ascending: false });

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
        return;
      }

      console.log(`[usePublicProperties] 📦 Recebidos ${data.length} imóveis. Mapeando dados...`);
      const mapStart = performance.now();

      // Mapear dados do banco para o formato Property (OTIMIZADO)
      const mappedProperties: Property[] = data.map((prop: any) => {
        const loc = Array.isArray(prop.locations) ? prop.locations[0] : prop.locations;
        const locName = loc?.name || "";

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
          location: locName,
          locationDetails: loc ? {
            id: loc.id,
            name: loc.name,
            city: loc.city || "",
            neighborhood: loc.neighborhood || "",
            state: loc.state || "",
            address: loc.street || "",
            zipCode: loc.zip_code || ""
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
      const errorTime = performance.now() - startTime;
      console.error(`[usePublicProperties] ❌ ERRO após ${errorTime.toFixed(0)}ms:`, err);
      setError(err?.message || "Erro ao carregar imóveis");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    properties,
    loading,
    error,
    refresh: loadProperties,
  };
}