import type { NextApiRequest, NextApiResponse } from "next";
import { migrateProportionalFirstPayments } from "@/services/paymentService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Apenas permitir POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🚀 Iniciando migração de parcelas proporcionais...");
    
    const result = await migrateProportionalFirstPayments();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Migração concluída com sucesso!",
        processed: result.processed,
        updated: result.updated,
        errors: result.errors,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Migração concluída com erros",
        processed: result.processed,
        updated: result.updated,
        errors: result.errors,
      });
    }
  } catch (error: any) {
    console.error("❌ Erro crítico na migração:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao executar migração",
      error: error.message,
    });
  }
}