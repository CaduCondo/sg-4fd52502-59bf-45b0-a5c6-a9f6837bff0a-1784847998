import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

/**
 * API Route: /api/properties/available
 * Otimizada para listar apenas imóveis disponíveis (públicos)
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
    console.log("=== API /properties/available: Fetching data (OPTIMIZED) ===");

    // Query otimizada - apenas status 'available'
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        location_id,
        property_identifier,
        complement,
        description,
        rooms,
        bathrooms,
        area,
        has_garage,
        value,
        garage_value,
        status,
        images,
        has_furniture,
        accepts_pets,
        created_at,
        updated_at,
        locations!properties_location_id_fkey (
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
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ 
        error: "Database error", 
        message: error.message,
        hint: "Check if idx_properties_status index exists"
      });
    }

    // Transform data
    const properties = (data || []).map((item: any) => ({
      id: item.id,
      locationId: item.location_id,
      location: item.locations?.name || "",
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
      address: item.locations?.street,
      number: item.locations?.number,
      neighborhood: item.locations?.neighborhood,
      city: item.locations?.city,
      state: item.locations?.state,
      zipCode: item.locations?.zip_code,
      bedrooms: item.rooms,
      monthlyRent: item.value,
    }));

    console.log(`✅ API /properties/available: Returning ${properties.length} available properties`);

    // Cache headers (30 minutes - mais curto para dados públicos)
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");

    return res.status(200).json(properties);
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error?.message || "Unknown error",
      hint: "This might be a timeout. Check database performance."
    });
  }
}