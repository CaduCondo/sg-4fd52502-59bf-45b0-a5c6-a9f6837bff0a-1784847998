import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Criar cliente Supabase server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Fetching available properties (public route via Supabase Client)...");

    // Query usando Supabase Client (usa HTTP/REST, não TCP direto)
    const { data: properties, error } = await supabase
      .from("properties")
      .select(`
        id,
        title,
        description,
        property_type,
        status,
        value,
        bedrooms,
        bathrooms,
        area,
        address,
        neighborhood,
        city,
        state,
        zip_code,
        images,
        features,
        owner_name,
        owner_phone,
        owner_email,
        notes,
        location_id,
        created_at,
        updated_at,
        locations:location_id (
          id,
          name,
          address,
          phone,
          email
        )
      `)
      .eq("status", "disponível")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    // Transformar dados para manter compatibilidade com formato anterior
    const transformedProperties = properties?.map((prop: any) => {
      const location = Array.isArray(prop.locations) ? prop.locations[0] : prop.locations;
      
      return {
        ...prop,
        location_name: location?.name || null,
        location_address: location?.address || null,
        location_phone: location?.phone || null,
        location_email: location?.email || null,
      };
    }) || [];

    console.log(`✅ Found ${transformedProperties.length} available properties`);

    return res.status(200).json({
      properties: transformedProperties,
      count: transformedProperties.length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching available properties:", error);
    return res.status(500).json({
      error: "Failed to fetch available properties",
      message: error.message,
    });
  }
}