import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";

export type SortOption = "newest" | "price-asc" | "price-desc" | "area-desc";

export interface PublicProperty extends Property {
  locationName?: string;
  name?: string;
  street?: string;
  rentAmount: number;
  condominiumAmount: number;
  iptuAmount: number;
  photos: string[];
  parkingSpaces: number;
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
          *,
          locations!inner(id, name)
        `)
        .eq("status", "available")
        .eq("locations.is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedProperties: PublicProperty[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        street: item.street || "",
        number: item.number || "",
        complement: item.complement || "",
        neighborhood: item.neighborhood || "",
        city: item.city || "",
        state: item.state || "",
        zipCode: item.zip_code || "",
        type: item.type || "apartment",
        bedrooms: item.bedrooms || 0,
        bathrooms: item.bathrooms || 0,
        parkingSpaces: item.parking_spaces || 0,
        area: item.area || 0,
        rentAmount: item.rent_amount || 0,
        iptuAmount: item.iptu_amount || 0,
        condominiumAmount: item.condominium_amount || 0,
        photos: Array.isArray(item.photos) ? item.photos : [],
        status: item.status || "available",
        locationId: item.location_id,
        locationName: item.locations?.name || "",
        createdAt: item.created_at,
        updatedAt: item.updated_at,
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
      property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesLocation && matchesSearch;
  }).sort((a, b) => {
    const totalA = a.rentAmount + (a.condominiumAmount || 0) + (a.iptuAmount || 0);
    const totalB = b.rentAmount + (b.condominiumAmount || 0) + (b.iptuAmount || 0);

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