import type { NextApiRequest, NextApiResponse } from "next";
import { generateMissingDepositInstallments } from "@/services/generateMissingDepositInstallments";

/**
 * API Route para gerar parcelas de caução para locações existentes
 * POST /api/generate-deposit-installments
 * 
 * Esta rota deve ser chamada apenas uma vez para migrar dados existentes
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 API: Iniciando geração de parcelas de caução...");
    
    const result = await generateMissingDepositInstallments();
    
    console.log("✅ API: Geração concluída com sucesso");
    
    return res.status(200).json({
      message: "Parcelas de caução geradas com sucesso",
      result,
    });
  } catch (error) {
    console.error("❌ API: Erro ao gerar parcelas:", error);
    
    return res.status(500).json({
      error: "Erro ao gerar parcelas de caução",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}