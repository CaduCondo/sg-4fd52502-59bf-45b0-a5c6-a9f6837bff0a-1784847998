import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🧪 Testing Supabase connection...");

  try {
    // Test 1: Simple query
    console.log("📡 Test 1: Fetching from properties table...");
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id")
      .limit(1);

    if (propertiesError) {
      console.error("❌ Properties query failed:", propertiesError);
      return res.status(500).json({
        success: false,
        test: "properties",
        error: propertiesError.message,
        details: propertiesError,
      });
    }

    console.log("✅ Properties test passed:", properties);

    // Test 2: Auth session
    console.log("🔐 Test 2: Checking auth session...");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("⚠️ Session check failed:", sessionError);
    }

    console.log("✅ Session test passed:", session ? "Authenticated" : "Not authenticated");

    // Test 3: Check if database is responsive
    console.log("⚡ Test 3: Database health check...");
    const { data: healthCheck, error: healthError } = await supabase
      .from("locations")
      .select("id")
      .limit(1);

    if (healthError) {
      console.error("❌ Health check failed:", healthError);
      return res.status(500).json({
        success: false,
        test: "health_check",
        error: healthError.message,
        details: healthError,
      });
    }

    console.log("✅ Health check passed:", healthCheck);

    // All tests passed
    return res.status(200).json({
      success: true,
      message: "✅ All Supabase connection tests passed!",
      tests: {
        properties: "✅ Connected",
        session: session ? "✅ Authenticated" : "⚠️ Not authenticated",
        health: "✅ Database responsive",
      },
      data: {
        propertiesCount: properties?.length || 0,
        locationsCount: healthCheck?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("💥 Unexpected error during Supabase test:", error);
    return res.status(500).json({
      success: false,
      error: "Unexpected error",
      message: error?.message || "Unknown error",
      stack: error?.stack,
    });
  }
}