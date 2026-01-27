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
    // Buscar tenant_id e user_id dos headers (enviados pelo frontend)
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = req.headers["x-user-id"] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Tenant or user not found" 
      });
    }

    console.log(`🔍 Fetching properties for tenant: ${tenantId}, user: ${userId}`);

    // Query usando Supabase Client
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
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    // Transformar dados
    const transformedProperties = properties?.map(prop => ({
      ...prop,
      location_name: prop.locations?.name || null,
      location_address: prop.locations?.address || null,
      location_phone: prop.locations?.phone || null,
      location_email: prop.locations?.email || null,
    })) || [];

    console.log(`✅ Found ${transformedProperties.length} properties`);

    return res.status(200).json({
      properties: transformedProperties,
      count: transformedProperties.length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching properties:", error);
    return res.status(500).json({
      error: "Failed to fetch properties",
      message: error.message,
    });
  }
}