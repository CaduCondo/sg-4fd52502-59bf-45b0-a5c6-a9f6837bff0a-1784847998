import { useState, useEffect } from "react";
import { Property } from "@/types";
import { SortOption } from "@/components/public/SortSelector";

interface Filters {
  location?: string;
  sort?: SortOption;
}

export function usePublicProperties(filters: Filters = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, [filters.location, filters.sort]);

  async function loadProperties() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.location) params.append("location", filters.location);
      
      // Lógica de ordenação
      switch (filters.sort) {
        case "price-asc":
          params.append("sort", "value");
          params.append("order", "asc");
          break;
        case "price-desc":
          params.append("sort", "value");
          params.append("order", "desc");
          break;
        case "area-desc":
          params.append("sort", "area");
          params.append("order", "desc");
          break;
        case "newest":
        default:
          params.append("sort", "created_at");
          params.append("order", "desc");
          break;
      }

      const response = await fetch(`/api/properties/available?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar imóveis disponíveis");
      }

      const data = await response.json();
      
      // Mapear campos do banco para frontend
      const mappedProperties: Property[] = (data || []).map((prop: any) => {
        // Extrair dados da localização (se existir)
        const locationData = prop.locations || {};
        const city = locationData.city || "";
        const state = locationData.state || "";
        const neighborhood = locationData.neighborhood || "";
        const locationName = locationData.name || "";

        return {
          id: prop.id,
          locationId: prop.location_id,
          complement: prop.complement || "",
          
          // Informações do imóvel
          type: prop.property_type || "Outros",
          propertyIdentifier: prop.property_identifier || "",
          rooms: prop.bedrooms || 0,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          
          // Valores
          value: prop.value || 0,
          garageValue: prop.garage_value || 0,
          
          // Características
          hasGarage: prop.has_garage || false,
          hasFurniture: prop.has_furniture || false,
          acceptsPets: prop.accepts_pets || false,
          
          // Textos
          description: prop.description || "",
          status: prop.status,
          images: Array.isArray(prop.images) ? prop.images : [],
          createdAt: prop.created_at,
          
          // Localização (string para compatibilidade)
          location: locationName || `${city} - ${state}`,
          
          // Localização (campos individuais)
          city: city,
          state: state,
          neighborhood: neighborhood,
          
          // Localização (objeto completo)
          locationDetails: locationData.id ? {
            id: locationData.id,
            name: locationName,
            address: locationData.address || "",
            city: city,
            state: state,
            zipCode: locationData.zip_code || "",
            neighborhood: neighborhood,
          } : undefined,
        };
      });

      setProperties(mappedProperties);

    } catch (err: any) {
      console.error("Erro ao carregar imóveis públicos:", err);
      setError(err.message || "Erro ao carregar imóveis");
    } finally {
      setLoading(false);
    }
  }

  return {
    properties,
    loading,
    error,
    refresh: loadProperties,
  };
}