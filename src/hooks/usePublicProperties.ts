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
  locationNeighborhood: string;
  createdAt: string;
}

export function usePublicProperties() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; city: string; neighborhood: string }>
  >([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch locations
  const fetchLocations = async () => {
    const { data } = await supabase
      .from("locations")
      .select("id, name, city, neighborhood")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setLocations(data);
    }
  };

  // Fetch properties with optimized queries (NO JOIN)
  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      console.log("=== FETCHING PUBLIC PROPERTIES (OPTIMIZED) ===");
      
      // Query 1: Fetch properties only (simple, fast)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (propertiesError) throw propertiesError;

      if (!propertiesData || propertiesData.length === 0) {
        console.log("No properties found");
        setProperties([]);
        setIsLoading(false);
        return;
      }

      console.log(`Fetched ${propertiesData.length} properties`);

      // Query 2: Fetch locations separately (batch fetch for efficiency)
      const locationIds = [...new Set(propertiesData.map(p => p.location_id))];
      console.log(`Fetching ${locationIds.length} unique locations`);

      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("id, name, city, state, neighborhood, is_active")
        .in("id", locationIds)
        .eq("is_active", true);

      if (locationsError) throw locationsError;

      console.log(`Fetched ${locationsData?.length || 0} active locations`);

      // Create lookup map for O(1) access
      const locationsMap = new Map(locationsData?.map(loc => [loc.id, loc]) || []);

      // Merge data in frontend - only include properties with active locations
      const mappedProperties: PublicProperty[] = propertiesData
        .filter(item => {
          const location = locationsMap.get(item.location_id);
          return location && location.is_active === true;
        })
        .map((item) => {
          const location = locationsMap.get(item.location_id);
          
          return {
            id: item.id,
            propertyIdentifier: item.property_identifier || "",
            description: item.description || "",
            rooms: item.rooms || 0,
            bathrooms: item.bathrooms || 0,
            area: item.area || 0,
            hasGarage: item.has_garage || false,
            garageValue: item.garage_value || 0,
            value: item.value || 0,
            images: Array.isArray(item.images) ? item.images : [],
            hasFurniture: item.has_furniture || false,
            acceptsPets: item.accepts_pets || false,
            status: item.status || "available",
            locationId: item.location_id,
            locationName: location?.name || "",
            locationCity: location?.city || "",
            locationState: location?.state || "",
            locationNeighborhood: location?.neighborhood || "",
            createdAt: item.created_at,
          };
        });

      console.log(`Mapped ${mappedProperties.length} properties with active locations`);
      setProperties(mappedProperties);
    } catch (error) {
      console.error("Error loading properties:", error);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchProperties();
    fetchLocations();
  }, []);

  // Filter and sort properties
  const filteredProperties = properties.filter((property) => {
    const matchesLocation =
      selectedLocation === "all" || property.locationId === selectedLocation;
    
    const matchesSearch =
      searchTerm === "" ||
      property.propertyIdentifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.locationCity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.locationNeighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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