import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🚀 Fetching all properties via Next.js API Route");

    const sql = `
      SELECT 
        p.id,
        p.status,
        p.description,
        p.property_identifier,
        p.complement,
        p.rooms,
        p.bathrooms,
        p.area,
        p.has_garage,
        p.garage_value,
        p.value,
        p.has_furniture,
        p.accepts_pets,
        p.created_at,
        p.images,
        l.id as location_id,
        l.name as location_name,
        l.neighborhood,
        l.city,
        l.state
      FROM properties p
      LEFT JOIN locations l ON p.location_id = l.id
      ORDER BY p.created_at DESC
      LIMIT 100
    `;

    const rows = await query(sql);

    // Mapear para o formato esperado pelo frontend
    const properties = rows.map((row: any) => ({
      id: row.id,
      status: row.status,
      description: row.description,
      property_identifier: row.property_identifier,
      complement: row.complement,
      rooms: row.rooms,
      bathrooms: row.bathrooms,
      area: row.area,
      has_garage: row.has_garage,
      garage_value: row.garage_value,
      value: row.value,
      has_furniture: row.has_furniture,
      accepts_pets: row.accepts_pets,
      created_at: row.created_at,
      images: row.images,
      location: row.location_id ? {
        id: row.location_id,
        name: row.location_name,
        neighborhood: row.neighborhood,
        city: row.city,
        state: row.state,
      } : null,
    }));

    console.log(`✅ Fetched ${properties.length} properties`);

    return res.status(200).json({
      data: properties,
      count: properties.length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching properties:", error);
    return res.status(500).json({
      error: "Failed to fetch properties",
      message: error.message,
    });
  }
}