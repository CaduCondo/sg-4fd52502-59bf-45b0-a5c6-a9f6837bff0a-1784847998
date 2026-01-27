import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Fetching available properties (public route)...");

    // Query PÚBLICA - não precisa verificar tenant/user
    // Apenas busca imóveis disponíveis e ativos
    const sql = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.property_type,
        p.status,
        p.value,
        p.bedrooms,
        p.bathrooms,
        p.area,
        p.address,
        p.neighborhood,
        p.city,
        p.state,
        p.zip_code,
        p.images,
        p.features,
        p.owner_name,
        p.owner_phone,
        p.owner_email,
        p.notes,
        p.location_id,
        p.created_at,
        p.updated_at,
        l.name as location_name,
        l.address as location_address,
        l.phone as location_phone,
        l.email as location_email
      FROM properties p
      LEFT JOIN locations l ON p.location_id = l.id
      WHERE p.status = 'disponível'
      ORDER BY p.created_at DESC;
    `;

    const properties = await query(sql);

    console.log(`✅ Found ${properties.length} available properties`);

    return res.status(200).json({
      properties,
      count: properties.length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching available properties:", error);
    return res.status(500).json({
      error: "Failed to fetch available properties",
      message: error.message,
    });
  }
}