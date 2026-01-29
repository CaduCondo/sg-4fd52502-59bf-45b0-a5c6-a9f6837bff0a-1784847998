import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { location, sort = "created_at", order = "desc" } = req.query;

    // Query otimizada com JOIN direto
    let query = supabase
      .from("properties")
      .select(`
        id,
        location_id,
        complement,
        property_type,
        property_identifier,
        bedrooms,
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
        created_at,
        updated_at,
        locations (
          id,
          name,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          zip_code
        )
      `)
      .eq("status", "available");

    // Filtrar por localização se fornecido
    if (location && typeof location === "string") {
      query = query.eq("locations.name", location);
    }

    // Ordenação
    const validSorts = ["created_at", "value", "area"];
    const validOrders = ["asc", "desc"];
    const sortField = validSorts.includes(sort as string) ? sort : "created_at";
    const sortOrder = validOrders.includes(order as string) ? (order as "asc" | "desc") : "desc";

    query = query.order(sortField, { ascending: sortOrder === "asc" }).limit(50);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ 
        error: "Failed to fetch properties",
        message: error.message 
      });
    }

    // Cache agressivo para performance
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    return res.status(200).json(data || []);

  } catch (error: any) {
    console.error("API error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error?.message || "Unknown error"
    });
  }
}