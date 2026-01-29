import { useState, useEffect } from "react";
import { Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface UsePublicPropertiesProps {
  location?: string;
  sort?: string;
}

export function usePublicProperties(props?: UsePublicPropertiesProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []); // Executa apenas uma vez na montagem

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[Hook] Buscando imóveis disponíveis...");

      // Query DIRETA e SIMPLES ao Supabase
      // Trazendo apenas o necessário para evitar timeouts e erros
      const { data, error: queryError } = await supabase
        .from("properties")
        .select(`
          *,
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

      if (queryError) {
        console.error("[Hook] Erro no Supabase:", queryError);
        throw new Error(queryError.message);
      }

      if (!data) {
        setProperties([]);
        return;
      }

      // Mapeamento ROBUSTO para satisfazer a interface Property
      const mappedProperties: Property[] = data.map((item: any) => {
        // Garantir que locations é um objeto (pode vir array se o join for 1:N mal configurado, ou objeto se 1:1)
        const loc = Array.isArray(item.locations) ? item.locations[0] : item.locations;

        return {
          id: item.id,
          // Campos obrigatórios da interface Property (camelCase)
          locationId: item.location_id,
          location: loc?.name || "Localização não definida",
          complement: item.complement || "",
          
          // Campos de endereço mapeados de locations
          address: loc?.street || "",
          number: loc?.number || "",
          neighborhood: loc?.neighborhood || "",
          city: loc?.city || "",
          state: loc?.state || "",
          zipCode: loc?.zip_code || "",

          // Campos do imóvel
          description: item.description || "",
          rooms: item.rooms || 0,
          bedrooms: item.rooms || 0, // Fallback de compatibilidade
          bathrooms: item.bathrooms || 0,
          area: item.area || 0,
          hasGarage: item.has_garage || false,
          
          // Novos campos
          images: item.images || [],
          hasFurniture: item.has_furniture || false,
          acceptsPets: item.accepts_pets || false,
          
          // Financeiro
          value: item.value || 0,
          garageValue: item.garage_value || 0,

          // Status & Metadata
          status: item.status,
          propertyIdentifier: item.property_identifier || "",
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          
          // Objeto detalhado de localização
          locationDetails: loc ? {
            id: loc.id,
            name: loc.name,
            city: loc.city,
            state: loc.state,
            neighborhood: loc.neighborhood,
            address: loc.street,
            zipCode: loc.zip_code
          } : undefined,

          // Campos snake_case (opcionais, mas mantidos se a interface pedir)
          location_id: item.location_id,
          has_garage: item.has_garage,
          garage_value: item.garage_value,
          property_identifier: item.property_identifier,
          has_furniture: item.has_furniture,
          accepts_pets: item.accepts_pets,
          
          // Valores padrão
          type: "Apartamento"
        };
      });

      console.log(`[Hook] Sucesso! ${mappedProperties.length} imóveis carregados.`);
      setProperties(mappedProperties);

    } catch (err: any) {
      console.error("[Hook] Erro fatal:", err);
      setError(err.message || "Erro ao carregar imóveis.");
      // Não limpa properties se tiver erro, para não piscar tela vazia se já tiver dados (opcional)
      // setProperties([]); 
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