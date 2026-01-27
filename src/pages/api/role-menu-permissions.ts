import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Criar cliente Supabase server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "Content-Type": "application/json",
    },
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    console.log("🔍 [API] Fetching role menu permissions...");

    // Query otimizada com timeout
    const { data: permissions, error } = await supabase
      .from("role_menu_permissions")
      .select("*")
      .order("role", { ascending: true })
      .order("menu_item", { ascending: true });

    if (error) {
      console.error("❌ [API] Supabase error:", error);
      
      // Retornar erro específico para debug
      return res.status(500).json({
        error: "Database query failed",
        message: error.message,
        details: error.details || null,
        hint: error.hint || null,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] Found ${permissions?.length || 0} permissions in ${duration}ms`);

    return res.status(200).json({
      permissions: permissions || [],
      count: permissions?.length || 0,
      duration_ms: duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ [API] Error fetching role menu permissions:", error);
    
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Unknown error occurred",
      duration_ms: duration,
    });
  }
}