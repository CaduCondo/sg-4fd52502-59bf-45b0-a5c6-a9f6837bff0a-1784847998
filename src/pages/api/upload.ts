import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filename: (name, ext, part) => {
      const uniqueName = `file_${Date.now()}${ext}`;
      console.log("📦 Uploading file:", uniqueName, "Type:", part.mimetype);
      return uniqueName;
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    console.log("✅ File parsed successfully");

    const file = files.file?.[0];
    
    if (!file) {
      console.error("❌ No file found in request");
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png", 
      "image/webp",
      "application/pdf"
    ];

    if (!allowedTypes.includes(file.mimetype || "")) {
      console.error("❌ Invalid file type:", file.mimetype);
      fs.unlinkSync(file.filepath);
      return res.status(400).json({ 
        error: "Tipo de arquivo não suportado. Use JPG, PNG, WEBP ou PDF" 
      });
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      console.error("❌ File too large:", file.size);
      fs.unlinkSync(file.filepath);
      return res.status(400).json({ 
        error: "Arquivo muito grande. Máximo 10MB" 
      });
    }

    const filename = path.basename(file.filepath);
    const url = `/uploads/${filename}`;
    
    console.log("✅ Upload successful:", url);
    return res.status(200).json({ url });

  } catch (error) {
    console.error("❌ Upload error:", error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: "Erro ao processar upload",
        details: error.message 
      });
    }
    
    return res.status(500).json({ 
      error: "Erro ao processar upload. Tente novamente" 
    });
  }
}