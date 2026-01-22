import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SortOption = "newest" | "price-asc" | "price-desc" | "area-desc";

export interface PublicProperty {
  id: string;
  propertyIdentifier: string;
  description: string;
  rooms: number;
  bathrooms: number;
  area: number;
  hasGarage: boolean;
  garageValue: number;
  value: number;
  images: string[];
  hasFurniture: boolean;
  acceptsPets: boolean;
  status: string;
  locationId: string;
  locationName: string;
  locationCity: string;
  locationState: string;
  createdAt: string;
}

export function usePublicProperties() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          property_identifier,
          description,
          rooms,
          bathrooms,
          area,
          has_garage,
          garage_value,
          value,
          images,
          has_furniture,
          accepts_pets,
          status,
          location_id,
          created_at,
          locations!inner(
            id,
            name,
            city,
            state,
            is_active
          )
        `)
        .eq("status", "available")
        .eq("locations.is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedProperties: PublicProperty[] = (data || []).map((item: any) => ({
        id: item.id,
        propertyIdentifier: item.property_identifier || "",
        description: item.description || "",
        rooms: item.rooms || 0,
        bathrooms: item.bathrooms || 0,
        area: Number(item.area) || 0,
        hasGarage: item.has_garage || false,
        garageValue: Number(item.garage_value) || 0,
        value: Number(item.value) || 0,
        images: Array.isArray(item.images) ? item.images : [],
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        status: item.status || "available",
        locationId: item.location_id,
        locationName: item.locations?.name || "",
        locationCity: item.locations?.city || "",
        locationState: item.locations?.state || "",
        createdAt: item.created_at || "",
      }));

      setProperties(mappedProperties);
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesLocation =
      selectedLocation === "all" || property.locationId === selectedLocation;
    
    const matchesSearch =
      searchTerm === "" ||
      property.propertyIdentifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.locationCity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesLocation && matchesSearch;
  }).sort((a, b) => {
    const totalA = a.value + (a.garageValue || 0);
    const totalB = b.value + (b.garageValue || 0);

    switch (sortBy) {
      case "price-asc":
        return totalA - totalB;
      case "price-desc":
        return totalB - totalA;
      case "area-desc":
        return (b.area || 0) - (a.area || 0);
      case "newest":
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  return {
    properties: filteredProperties,
    locations,
    selectedLocation,
    setSelectedLocation,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    isLoading,
  };
}