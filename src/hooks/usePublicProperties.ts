import { useState, useEffect } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export function usePublicProperties(options?: { location?: string; sort?: string }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const startTime = performance.now();
    console.log("[Hook] Starting to fetch properties...");

    try {
      setLoading(true);
      setError(null);

      // Query DIRETA e SIMPLES - busca apenas o necessário
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
          locations (
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

      const fetchTime = performance.now();
      console.log(`[Hook] Fetch completed in ${(fetchTime - startTime).toFixed(2)}ms`);

      if (fetchError) {
        console.error("[Hook] Fetch error:", fetchError);
        throw fetchError;
      }

      if (!data) {
        console.warn("[Hook] No data returned");
        setProperties([]);
        setLoading(false);
        return;
      }

      console.log(`[Hook] Received ${data.length} properties`);

      // Mapear dados do banco para o formato Property
      const mappedProperties: Property[] = data.map((prop: any) => {
        // Locations pode vir como array ou objeto
        const locationData = Array.isArray(prop.locations) 
          ? prop.locations[0] 
          : prop.locations;

        const locationName = locationData?.name || "";

        return {
          id: prop.id,
          locationId: prop.location_id,
          complement: prop.complement || "",
          rooms: prop.rooms || 0,
          bedrooms: prop.rooms || 0, // Usa rooms como bedrooms para compatibilidade
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
          type: "Apartamento", // Valor padrão já que não temos property_type no banco
          createdAt: prop.created_at,
          location: locationName, // String com o nome da localização
          locationDetails: locationData ? { // Objeto com os detalhes
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

      const mapTime = performance.now();
      console.log(`[Hook] Mapping completed in ${(mapTime - fetchTime).toFixed(2)}ms`);
      console.log(`[Hook] Total time: ${(mapTime - startTime).toFixed(2)}ms`);

      setProperties(mappedProperties);
      setError(null);
    } catch (err: any) {
      console.error("[Hook] Error loading properties:", err);
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