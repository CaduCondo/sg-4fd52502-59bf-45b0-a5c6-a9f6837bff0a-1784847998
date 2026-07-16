import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Health Check Endpoint
 * Usado pelos testes e monitoramento para verificar se a aplicação está rodando
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Retorna status OK com timestamp
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Health check failed",
    });
  }
}