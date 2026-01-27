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
    console.log("🔍 [API] Fetching all properties with optimized query...");

    // Query otimizada: 1 única query com LEFT JOIN
    // Usa índice idx_properties_status_created_at para ordenação rápida
    const { data: properties, error: propError } = await supabase
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
      .order("created_at", { ascending: false });

    if (propError) {
      console.error("❌ [API] Error fetching properties:", propError);
      throw propError;
    }

    if (!properties || properties.length === 0) {
      console.log("ℹ️ [API] No properties found");
      return res.status(200).json({ properties: [], count: 0 });
    }

    console.log(`✅ [API] Found ${properties.length} properties, transforming data...`);

    // Transformar dados para o formato esperado pelo frontend
    const transformedProperties = properties.map((prop) => {
      const location = prop.locations;
      
      // Montar endereço completo
      const fullAddress = location ? 
        `${location.street || ''}, ${location.number || ''} ${location.complement || ''} - ${location.neighborhood || ''}, ${location.city || ''}/${location.state || ''}`.trim() : 
        prop.complement || null;
      
      return {
        id: prop.id,
        // Campos com valores padrão (não existem no banco)
        type: "Apartamento",
        title: prop.property_identifier || "Imóvel sem identificação",
        
        // Campos reais mapeados
        status: prop.status,
        value: prop.value,
        bedrooms: prop.rooms, // rooms -> bedrooms
        bathrooms: prop.bathrooms,
        area: prop.area,
        address: fullAddress,
        neighborhood: location?.neighborhood || null,
        city: location?.city || null,
        state: location?.state || null,
        zip_code: location?.zip_code || null,
        images: Array.isArray(prop.images) ? prop.images : [],
        features: {
          has_garage: prop.has_garage || false,
          garage_value: prop.garage_value || null,
          has_furniture: prop.has_furniture || false,
          accepts_pets: prop.accepts_pets || false,
        },
        location_id: location?.id || null,
        created_at: prop.created_at,
        updated_at: prop.updated_at,
        description: prop.description,
        property_identifier: prop.property_identifier,
        complement: prop.complement,
        
        // Campos nulos (não existem no banco)
        owner_name: null,
        owner_phone: null,
        owner_email: null,
        notes: null,
        location_name: location?.name || null,
        location_address: fullAddress,
        location_phone: null,
        location_email: null
      };
    });

    console.log(`✅ [API] Successfully transformed and returning ${transformedProperties.length} properties`);

    return res.status(200).json({
      properties: transformedProperties,
      count: transformedProperties.length,
    });
  } catch (error: any) {
    console.error("❌ [API] Server Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      details: error.details || null,
    });
  }
}