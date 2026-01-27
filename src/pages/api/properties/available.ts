import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    console.log("🔍 [API /available] Fetching available properties...");

    // Criar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Query OTIMIZADA com LEFT JOIN - 1 única query rápida
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
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      const duration = Date.now() - startTime;
      console.error("❌ [API /available] Supabase error:", error);
      return res.status(500).json({
        error: "Database query failed",
        message: error.message,
        details: error.details || null,
        duration_ms: duration,
      });
    }

    if (!properties || properties.length === 0) {
      const duration = Date.now() - startTime;
      console.log("⚠️ [API /available] No available properties found");
      return res.status(200).json({ 
        properties: [],
        count: 0,
        duration_ms: duration,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API /available] Found ${properties.length} available properties (${duration}ms)`);

    // Transformar dados para o formato esperado pelo frontend
    const transformedProperties = properties.map((prop: any) => {
      // Tratar locations: pode ser array ou objeto único
      const locationData = prop.locations;
      const location = Array.isArray(locationData) ? locationData[0] : locationData;

      // Montar endereço completo
      const fullAddress = location
        ? `${location.street}, ${location.number}${location.complement ? ` - ${location.complement}` : ""} - ${location.neighborhood}, ${location.city}/${location.state}`
        : "Endereço não informado";

      // Tratar complement da property (pode ser null)
      const propertyComplement = prop.complement && location
        ? `${prop.complement}${location.complement ? ` - ${location.complement}` : ''}${location.street ? ` - ${location.street}, ${location.number || ''}` : ''}${location.neighborhood ? ` - ${location.neighborhood}` : ''}${location.city ? ` - ${location.city}` : ''}${location.state ? `/${location.state || ''}` : ''}`.trim()
        : prop.complement || null;

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
        complement: propertyComplement,
      };
    });

    return res.status(200).json({ 
      properties: transformedProperties,
      count: transformedProperties.length,
      duration_ms: duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ [API /available] Unexpected error:", error);
    return res.status(500).json({
      error: "Failed to fetch available properties",
      message: error.message || "Unknown error occurred",
      duration_ms: duration,
    });
  }
}