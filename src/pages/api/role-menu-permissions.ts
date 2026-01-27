import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🚀 Fetching role menu permissions via Next.js API Route");

    const sql = `
      SELECT *
      FROM role_menu_permissions
      ORDER BY role ASC
    `;

    const rows = await query(sql);

    console.log(`✅ Fetched ${rows.length} role menu permissions`);

    return res.status(200).json(rows);
  } catch (error: any) {
    console.error("❌ Error fetching role menu permissions:", error);
    return res.status(500).json({
      error: "Failed to fetch role menu permissions",
      message: error.message,
    });
  }
}