import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: "Missing fileName or fileData" });
    }

    // Remove o prefixo data:image/...;base64,
    const base64Data = fileData.replace(/^data:([A-Za-z-+\/]+);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Salvar na pasta public/uploads para ser acessível
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    
    // Criar pasta se não existir
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    res.status(200).json({ 
      success: true, 
      filePath: `/uploads/${fileName}` 
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
}