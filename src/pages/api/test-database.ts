import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{
      name: string;
      status: "success" | "error";
      duration_ms: number;
      result?: any;
      error?: string;
    }>,
  };

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ========================================
  // TESTE 1: Query SQL Mínima
  // ========================================
  try {
    const start1 = Date.now();
    const { data, error } = await supabase.rpc("test_simple_query", {});
    const duration1 = Date.now() - start1;

    if (error) {
      // Se a função não existe, criar manualmente
      console.log("⚠️ RPC function doesn't exist, trying direct query...");
      
      const start1b = Date.now();
      const { data: testData, error: testError } = await supabase
        .from("properties")
        .select("id")
        .limit(1)
        .single();
      const duration1b = Date.now() - start1b;

      results.tests.push({
        name: "Test 1: Minimal Query (SELECT 1 property)",
        status: testError ? "error" : "success",
        duration_ms: duration1b,
        result: testData ? { id: testData.id } : null,
        error: testError?.message,
      });
    } else {
      results.tests.push({
        name: "Test 1: Minimal Query (RPC)",
        status: "success",
        duration_ms: duration1,
        result: data,
      });
    }
  } catch (err: any) {
    results.tests.push({
      name: "Test 1: Minimal Query",
      status: "error",
      duration_ms: 0,
      error: err.message,
    });
  }

  // ========================================
  // TESTE 2: Count Total de Properties
  // ========================================
  try {
    const start2 = Date.now();
    const { count, error } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });
    const duration2 = Date.now() - start2;

    results.tests.push({
      name: "Test 2: Count Properties",
      status: error ? "error" : "success",
      duration_ms: duration2,
      result: { total_properties: count },
      error: error?.message,
    });
  } catch (err: any) {
    results.tests.push({
      name: "Test 2: Count Properties",
      status: "error",
      duration_ms: 0,
      error: err.message,
    });
  }

  // ========================================
  // TESTE 3: Query Simples SEM JOIN
  // ========================================
  try {
    const start3 = Date.now();
    const { data, error } = await supabase
      .from("properties")
      .select("id, status, property_identifier")
      .eq("status", "available")
      .limit(5);
    const duration3 = Date.now() - start3;

    results.tests.push({
      name: "Test 3: Simple Query (5 available properties, NO JOIN)",
      status: error ? "error" : "success",
      duration_ms: duration3,
      result: { count: data?.length || 0, sample: data?.[0] },
      error: error?.message,
    });
  } catch (err: any) {
    results.tests.push({
      name: "Test 3: Simple Query",
      status: "error",
      duration_ms: 0,
      error: err.message,
    });
  }

  // ========================================
  // TESTE 4: Query COM LEFT JOIN (locations)
  // ========================================
  try {
    const start4 = Date.now();
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        status,
        property_identifier,
        locations (
          id,
          name,
          city
        )
      `)
      .eq("status", "available")
      .limit(5);
    const duration4 = Date.now() - start4;

    results.tests.push({
      name: "Test 4: Query WITH JOIN (5 properties + locations)",
      status: error ? "error" : "success",
      duration_ms: duration4,
      result: { count: data?.length || 0, sample: data?.[0] },
      error: error?.message,
    });
  } catch (err: any) {
    results.tests.push({
      name: "Test 4: Query WITH JOIN",
      status: "error",
      duration_ms: 0,
      error: err.message,
    });
  }

  // ========================================
  // TESTE 5: Query COMPLETA (como na API real)
  // ========================================
  try {
    const start5 = Date.now();
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        locations (*)
      `)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(25);
    const duration5 = Date.now() - start5;

    results.tests.push({
      name: "Test 5: Full Query (25 properties with all data)",
      status: error ? "error" : "success",
      duration_ms: duration5,
      result: { count: data?.length || 0 },
      error: error?.message,
    });
  } catch (err: any) {
    results.tests.push({
      name: "Test 5: Full Query",
      status: "error",
      duration_ms: 0,
      error: err.message,
    });
  }

  // ========================================
  // RESUMO FINAL
  // ========================================
  const successCount = results.tests.filter((t) => t.status === "success").length;
  const errorCount = results.tests.filter((t) => t.status === "error").length;
  const totalDuration = results.tests.reduce((sum, t) => sum + t.duration_ms, 0);

  const summary = {
    total_tests: results.tests.length,
    passed: successCount,
    failed: errorCount,
    total_duration_ms: totalDuration,
    average_duration_ms: Math.round(totalDuration / results.tests.length),
    status: errorCount === 0 ? "✅ ALL TESTS PASSED" : `⚠️ ${errorCount} TEST(S) FAILED`,
  };

  return res.status(200).json({
    ...results,
    summary,
  });
}