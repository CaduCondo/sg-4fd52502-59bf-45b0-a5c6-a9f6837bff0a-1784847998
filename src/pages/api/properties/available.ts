import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

/**
 * API Route: /api/properties/available
 * ULTRA-OTIMIZADA: Query minimalista para evitar timeouts
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("=== API /properties/available: Starting ULTRA-FAST query ===");

    // STEP 1: Get properties ONLY (no JOINs) - ULTRA FAST
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("id, location_id, property_identifier, complement, description, rooms, bathrooms, area, has_garage, value, garage_value, status, images, has_furniture, accepts_pets, created_at, updated_at")
      .eq("status", "available")
      .limit(50); // Reduced from 200 to 50

    if (propError) {
      console.error("❌ Properties query error:", propError);
      return res.status(500).json({ 
        error: "Database error", 
        message: propError.message 
      });
    }

    if (!properties || properties.length === 0) {
      console.log("✅ No available properties found");
      return res.status(200).json([]);
    }

    console.log(`✅ Found ${properties.length} properties, fetching locations...`);

    // STEP 2: Get unique location_ids
    const locationIds = [...new Set(properties.map(p => p.location_id).filter(Boolean))];
    
    if (locationIds.length === 0) {
      console.log("⚠️ No locations to fetch, returning properties without location data");
      return res.status(200).json(properties.map(item => ({
        id: item.id,
        locationId: item.location_id,
        location: "",
        complement: item.complement,
        description: item.description,
        propertyIdentifier: item.property_identifier,
        rooms: item.rooms,
        bathrooms: item.bathrooms,
        area: item.area,
        value: item.value,
        garageValue: item.garage_value,
        hasGarage: item.has_garage || false,
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        status: item.status,
        images: Array.isArray(item.images) ? item.images : [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        bedrooms: item.rooms,
        monthlyRent: item.value,
      })));
    }

    // STEP 3: Fetch locations separately (FAST - only IDs we need)
    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("id, name, street, number, neighborhood, city, state, zip_code")
      .in("id", locationIds);

    if (locError) {
      console.error("❌ Locations query error:", locError);
      // Return properties without location data rather than failing
      return res.status(200).json(properties.map(item => ({
        id: item.id,
        locationId: item.location_id,
        location: "",
        complement: item.complement,
        description: item.description,
        propertyIdentifier: item.property_identifier,
        rooms: item.rooms,
        bathrooms: item.bathrooms,
        area: item.area,
        value: item.value,
        garageValue: item.garage_value,
        hasGarage: item.has_garage || false,
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        status: item.status,
        images: Array.isArray(item.images) ? item.images : [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        bedrooms: item.rooms,
        monthlyRent: item.value,
      })));
    }

    // STEP 4: Create location lookup map
    const locationMap = new Map();
    if (locations) {
      locations.forEach(loc => {
        locationMap.set(loc.id, loc);
      });
    }

    // STEP 5: Merge data
    const result = properties.map((item: any) => {
      const location = locationMap.get(item.location_id);
      
      return {
        id: item.id,
        locationId: item.location_id,
        location: location?.name || "",
        complement: item.complement,
        description: item.description,
        propertyIdentifier: item.property_identifier,
        rooms: item.rooms,
        bathrooms: item.bathrooms,
        area: item.area,
        value: item.value,
        garageValue: item.garage_value,
        hasGarage: item.has_garage || false,
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        status: item.status,
        images: Array.isArray(item.images) ? item.images : [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        address: location?.street || "",
        number: location?.number || "",
        neighborhood: location?.neighborhood || "",
        city: location?.city || "",
        state: location?.state || "",
        zipCode: location?.zip_code || "",
        bedrooms: item.rooms,
        monthlyRent: item.value,
      };
    });

    console.log(`✅ API /properties/available: Returning ${result.length} properties with location data`);

    // Short cache (5 minutes)
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error?.message || "Unknown error"
    });
  }
}