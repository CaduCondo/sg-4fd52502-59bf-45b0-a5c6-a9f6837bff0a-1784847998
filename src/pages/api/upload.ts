import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "10mb",
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
      filename: (name, ext, part) => {
        const uniqueName = `file_${Date.now()}${ext}`;
        return uniqueName;
      },
      filter: (part) => {
        const allowedMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png", 
          "image/webp",
          "application/pdf"
        ];
        
        return part.mimetype !== null && allowedMimeTypes.includes(part.mimetype);
      },
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error("Formidable parse error:", err);
            reject(err);
            return;
          }
          resolve([fields, files]);
        });
      }
    );

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ 
        error: "Nenhum arquivo foi enviado" 
      });
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    
    if (!file.newFilename) {
      return res.status(400).json({ 
        error: "Erro ao processar o arquivo" 
      });
    }

    const fileUrl = `/uploads/${file.newFilename}`;

    return res.status(200).json({ 
      url: fileUrl,
      filename: file.newFilename,
      originalName: file.originalFilename || "arquivo",
      size: file.size,
      mimetype: file.mimetype
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("maxFileSize")) {
        return res.status(400).json({ 
          error: "Arquivo muito grande. Tamanho máximo: 10MB" 
        });
      }
      
      if (error.message.includes("Invalid content type")) {
        return res.status(400).json({ 
          error: "Tipo de arquivo não permitido. Use imagens (JPG, PNG, WEBP) ou PDF" 
        });
      }
    }
    
    return res.status(500).json({ 
      error: "Erro ao processar upload. Tente novamente" 
    });
  }
}