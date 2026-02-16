import type { NextApiRequest, NextApiResponse } from "next";
import { migrateProportionalFirstPayments } from "@/services/paymentService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const result = await migrateProportionalFirstPayments();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Migration completed. ${result.count} payments updated.`,
        count: result.count,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Migration failed",
        count: 0,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Migration failed",
      count: 0,
    });
  }
}