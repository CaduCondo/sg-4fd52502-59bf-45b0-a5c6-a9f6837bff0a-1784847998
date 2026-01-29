import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

/**
 * API Route: /api/properties/available
 * ULTRA-OTIMIZADA: Query única com JOIN otimizado + índices
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
    console.log("=== API /properties/available: Starting optimized query ===");

    // Query ÚNICA otimizada com JOIN (usando índices criados)
    const { data: properties, error: propError } = await supabase
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
      .limit(50);

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

    console.log(`✅ Found ${properties.length} available properties`);

    // Mapear dados para o formato esperado pelo frontend
    const result = properties.map((item: any) => {
      const location = item.locations;
      
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

    console.log(`✅ API /properties/available: Returning ${result.length} properties`);

    // Cache agressivo: 5 minutos (300s) + stale-while-revalidate de 10 minutos (600s)
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