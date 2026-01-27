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
    console.log("🔍 Fetching role menu permissions...");

    // Query usando Supabase Client
    const { data: permissions, error } = await supabase
      .from("role_menu_permissions")
      .select("*")
      .order("role", { ascending: true })
      .order("menu", { ascending: true });

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    console.log(`✅ Found ${permissions?.length || 0} role menu permissions`);

    return res.status(200).json({
      permissions: permissions || [],
      count: permissions?.length || 0,
    });
  } catch (error: any) {
    console.error("❌ Error fetching role menu permissions:", error);
    return res.status(500).json({
      error: "Failed to fetch role menu permissions",
      message: error.message,
    });
  }
}