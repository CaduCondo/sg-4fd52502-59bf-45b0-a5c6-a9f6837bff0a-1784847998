import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 [API] Fetching available properties...");

    // Criar cliente Supabase (usa service_role para bypass RLS se necessário)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Query SIMPLIFICADA - sem JOIN para evitar timeout
    const { data: properties, error } = await supabase
      .from("properties")
      .select(`
        id,
        property_identifier,
        description,
        status,
        rooms,
        bathrooms,
        area,
        value,
        has_garage,
        garage_value,
        has_furniture,
        accepts_pets,
        images,
        complement,
        location_id,
        created_at,
        updated_at
      `)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(50); // Limitar para evitar timeout

    if (error) {
      console.error("❌ [API] Supabase error:", error);
      return res.status(500).json({
        error: "Database query failed",
        message: error.message,
      });
    }

    if (!properties || properties.length === 0) {
      console.log("⚠️ [API] No available properties found");
      return res.status(200).json({ properties: [] });
    }

    console.log(`✅ [API] Found ${properties.length} available properties`);

    // Buscar locations separadamente (mais rápido que JOIN)
    const locationIds = [...new Set(properties.map((p) => p.location_id).filter(Boolean))];
    
    let locationsMap: Record<string, any> = {};
    
    if (locationIds.length > 0) {
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name, street, number, complement, neighborhood, city, state, zip_code")
        .in("id", locationIds);

      if (locations) {
        locationsMap = locations.reduce((acc, loc) => {
          acc[loc.id] = loc;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Transformar dados
    const transformedProperties = properties.map((prop: any) => {
      const location = locationsMap[prop.location_id];
      const fullAddress = location
        ? `${location.street}, ${location.number}${location.complement ? ` - ${location.complement}` : ""} - ${location.neighborhood}, ${location.city}/${location.state}`
        : "Endereço não informado";

      return {
        id: prop.id,
        description: prop.description || "",
        status: prop.status,
        rooms: prop.rooms || 0,
        bathrooms: prop.bathrooms || 0,
        area: prop.area || 0,
        value: prop.value || 0,
        has_garage: prop.has_garage || false,
        garage_value: prop.garage_value || 0,
        has_furniture: prop.has_furniture || false,
        accepts_pets: prop.accepts_pets || false,
        images: prop.images || [],
        created_at: prop.created_at,
        updated_at: prop.updated_at,
        location_id: prop.location_id,
        location_name: location?.name || "Localização não informada",
        address: fullAddress,
        neighborhood: location?.neighborhood || "",
        city: location?.city || "",
        state: location?.state || "",
        zip_code: location?.zip_code || "",
        property_identifier: prop.property_identifier,
        complement: prop.complement,
      };
    });

    return res.status(200).json({ properties: transformedProperties });
  } catch (error: any) {
    console.error("❌ [API] Unexpected error:", error);
    return res.status(500).json({
      error: "Failed to fetch available properties",
      message: error.message,
    });
  }
}