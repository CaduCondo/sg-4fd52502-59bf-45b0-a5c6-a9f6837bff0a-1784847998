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
    console.log("🔍 Fetching all properties...");

    // 1. Buscar properties primeiro (Query Simples - SEM tenant_id)
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
        location_id,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (propError) {
      console.error("❌ Error fetching properties:", propError);
      throw propError;
    }

    if (!properties || properties.length === 0) {
      return res.status(200).json({ properties: [], count: 0 });
    }

    // 2. Buscar locations relacionadas (em lote)
    const locationIds = [...new Set(properties.map(p => p.location_id).filter(Boolean))];
    
    const locationsMap: Record<string, any> = {};
    
    if (locationIds.length > 0) {
      const { data: locations, error: locError } = await supabase
        .from("locations")
        .select("id, name, street, number, complement, neighborhood, city, state, zip_code")
        .in("id", locationIds);
        
      if (locError) {
        console.error("❌ Error fetching locations:", locError);
      } else {
        // Criar mapa para acesso rápido
        locations?.forEach(loc => {
          locationsMap[loc.id] = loc;
        });
      }
    }

    // 3. Combinar dados em memória
    const transformedProperties = properties.map((prop) => {
      const location = prop.location_id ? locationsMap[prop.location_id] : null;
      
      // Montar endereço completo
      const fullAddress = location ? 
        `${location.street || ''}, ${location.number || ''} ${location.complement || ''} - ${location.neighborhood || ''}, ${location.city || ''}/${location.state || ''}` : 
        prop.complement || null;
      
      return {
        id: prop.id,
        // Campos que não existem no banco, mas o frontend espera:
        type: "Apartamento", // Valor padrão já que não tem coluna type
        title: prop.property_identifier, // Usar identificador como título
        
        // Campos reais mapeados:
        status: prop.status,
        value: prop.value,
        bedrooms: prop.rooms, // rooms -> bedrooms (compatibilidade frontend)
        bathrooms: prop.bathrooms,
        area: prop.area,
        address: fullAddress,
        neighborhood: location?.neighborhood || null,
        city: location?.city || null,
        state: location?.state || null,
        zip_code: location?.zip_code || null,
        images: prop.images || [],
        features: {
          has_garage: prop.has_garage,
          garage_value: prop.garage_value,
          has_furniture: prop.has_furniture,
          accepts_pets: prop.accepts_pets,
        },
        location_id: prop.location_id,
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
        location_phone: null, // Não existe em locations
        location_email: null  // Não existe em locations
      };
    });

    console.log(`✅ Successfully returned ${transformedProperties.length} properties`);

    return res.status(200).json({
      properties: transformedProperties,
      count: transformedProperties.length,
    });
  } catch (error: any) {
    console.error("❌ Server Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}