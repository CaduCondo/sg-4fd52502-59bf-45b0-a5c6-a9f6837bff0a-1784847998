import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Validar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente faltando:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey
  });
}

// Service role client - SEM RLS, queries super rápidas!
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

// Cache em memória no servidor
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validar se o cliente foi criado
    if (!supabaseAdmin) {
      console.error("❌ Supabase Admin client não foi inicializado");
      return res.status(500).json({ 
        error: "Configuração inválida",
        message: "Service role key não configurada" 
      });
    }

    const now = Date.now();

    // Usar cache se válido
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log("✅ [API /public] Cache hit");
      return res.status(200).json(cachedData);
    }

    console.log("🔄 [API /public] Buscando imóveis públicos...");

    // Query OTIMIZADA com LEFT JOIN (no servidor é rápido!)
    const { data, error } = await supabaseAdmin
      .from("properties")
      .select(`
        id,
        location_id,
        property_identifier,
        complement,
        description,
        rooms,
        bathrooms,
        area,
        has_garage,
        value,
        has_furniture,
        accepts_pets,
        created_at,
        locations(name, city, neighborhood, street, number, state)
      `)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("❌ Erro ao buscar imóveis:", error);
      return res.status(500).json({ 
        error: "Erro na query do banco",
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    }

    if (!data || data.length === 0) {
      const emptyResult = { properties: [], count: 0 };
      return res.status(200).json(emptyResult);
    }

    // Mapear para formato esperado
    const properties = data.map((item: any) => {
      const addressParts = [];
      if (item.locations?.street) addressParts.push(item.locations.street);
      if (item.locations?.number) addressParts.push(item.locations.number);
      const address = addressParts.join(", ");

      return {
        id: item.id,
        locationId: item.location_id,
        location: item.locations?.name || "",
        city: item.locations?.city || "",
        neighborhood: item.locations?.neighborhood || "",
        state: item.locations?.state || "",
        address: address,
        propertyIdentifier: item.property_identifier || "",
        complement: item.complement || "",
        description: item.description || "",
        rooms: item.rooms || 0,
        bathrooms: item.bathrooms || 0,
        area: item.area || 0,
        value: item.value || 0,
        hasGarage: item.has_garage || false,
        hasFurniture: item.has_furniture || false,
        acceptsPets: item.accepts_pets || false,
        status: "available",
        images: [], // SEM IMAGES na listagem
        createdAt: item.created_at,
        features: [],
      };
    });

    const result = {
      properties,
      count: properties.length
    };

    // Atualizar cache
    cachedData = result;
    cacheTimestamp = now;

    console.log(`✅ [API /public] ${properties.length} imóveis retornados`);

    // Cache HTTP por 5 minutos
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ [API /public] Erro não tratado:", error);
    return res.status(500).json({ 
      error: "Erro interno do servidor",
      message: error?.message || "Erro desconhecido",
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined
    });
  }
}