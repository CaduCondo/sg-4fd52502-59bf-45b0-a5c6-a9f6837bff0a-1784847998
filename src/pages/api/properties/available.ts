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

    // Garantir que os parâmetros são strings
    const locationStr = Array.isArray(location) ? location[0] : location;
    const sortStr = Array.isArray(sort) ? sort[0] : sort;
    const orderStr = Array.isArray(order) ? order[0] : order;

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
    if (locationStr) {
      query = query.eq("locations.name", locationStr);
    }

    // Ordenação
    const validSorts = ["created_at", "value", "area"];
    const validOrders = ["asc", "desc"];
    
    // Fallback seguro para ordenação
    const sortField = validSorts.includes(sortStr || "") ? sortStr! : "created_at";
    const sortOrder = validOrders.includes(orderStr || "") ? (orderStr as "asc" | "desc") : "desc";

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