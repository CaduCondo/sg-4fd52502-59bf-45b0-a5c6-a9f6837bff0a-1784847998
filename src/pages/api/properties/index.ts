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
        status,
        description,
        property_identifier,
        complement,
        rooms,
        bathrooms,
        area,
        has_garage,
        garage_value,
        value,
        images,
        has_furniture,
        accepts_pets,
        location_id,
        created_at,
        updated_at,
        locations:location_id (
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
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    // Transformar dados
    const transformedProperties = properties?.map((prop: any) => {
      const location = Array.isArray(prop.locations) ? prop.locations[0] : prop.locations;
      
      // Montar endereço completo do location
      const fullAddress = location ? 
        `${location.street || ''}, ${location.number || ''} ${location.complement || ''} - ${location.neighborhood || ''}, ${location.city || ''}/${location.state || ''}` : 
        prop.complement || null;
      
      return {
        id: prop.id,
        type: null,
        status: prop.status,
        value: prop.value,
        bedrooms: prop.rooms, // rooms → bedrooms (compatibilidade)
        bathrooms: prop.bathrooms,
        area: prop.area,
        address: fullAddress,
        neighborhood: location?.neighborhood || null,
        city: location?.city || null,
        state: location?.state || null,
        zip_code: location?.zip_code || null,
        images: prop.images,
        features: {
          has_garage: prop.has_garage,
          garage_value: prop.garage_value,
          has_furniture: prop.has_furniture,
          accepts_pets: prop.accepts_pets,
        },
        location_id: prop.location_id,
        created_at: prop.created_at,
        updated_at: prop.updated_at,
        title: null,
        description: prop.description,
        owner_name: null,
        owner_phone: null,
        owner_email: null,
        notes: null,
        location_name: location?.name || null,
        location_address: fullAddress,
        location_phone: null,
        location_email: null,
        property_identifier: prop.property_identifier,
        complement: prop.complement,
      };
    }) || [];

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