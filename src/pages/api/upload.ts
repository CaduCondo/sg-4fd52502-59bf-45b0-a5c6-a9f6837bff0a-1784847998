import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";
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
  console.log("📨 Upload request received");
  console.log("Method:", req.method);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  if (req.method !== "POST") {
    console.log("❌ Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");

  try {
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log("📁 Creating upload directory:", uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    console.log("📁 Upload directory ready:", uploadDir);

    // Create formidable form with explicit options
    const form = new IncomingForm({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFields: 10,
      maxFieldsSize: 10 * 1024 * 1024,
      allowEmptyFiles: false,
      minFileSize: 1,
      filter: function ({ mimetype }) {
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "application/pdf"
        ];
        
        const isValid = allowedTypes.includes(mimetype || "");
        console.log("🔍 File type validation:", mimetype, "Valid:", isValid);
        return isValid;
      },
      filename: (name, ext, part) => {
        const uniqueName = `file_${Date.now()}${ext}`;
        console.log("📝 Generated filename:", uniqueName, "Original:", name, "Type:", part.mimetype);
        return uniqueName;
      },
    });

    console.log("📋 Starting file parse...");

    // Parse the form with promise wrapper for better error handling
    const parseForm = () => new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("❌ Parse error:", err);
          reject(err);
          return;
        }
        console.log("✅ Parse successful");
        console.log("Fields:", JSON.stringify(fields, null, 2));
        console.log("Files:", JSON.stringify(files, null, 2));
        resolve({ fields, files });
      });
    });

    const { fields, files } = await parseForm();

    // Handle both single file and array of files
    let file: FormidableFile | undefined;
    
    if (files.file) {
      if (Array.isArray(files.file)) {
        file = files.file[0];
        console.log("📦 File from array:", file);
      } else {
        file = files.file as FormidableFile;
        console.log("📦 Single file:", file);
      }
    }

    if (!file) {
      console.error("❌ No file found in request");
      console.log("Available files keys:", Object.keys(files));
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    console.log("📄 File details:", {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      filepath: file.filepath
    });

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf"
    ];

    if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
      console.error("❌ Invalid file type:", file.mimetype);
      try {
        fs.unlinkSync(file.filepath);
        console.log("🗑️ Invalid file removed");
      } catch (unlinkError) {
        console.error("⚠️ Error removing invalid file:", unlinkError);
      }
      return res.status(400).json({ 
        error: "Tipo de arquivo não suportado. Use JPG, PNG, WEBP ou PDF" 
      });
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      console.error("❌ File too large:", file.size);
      try {
        fs.unlinkSync(file.filepath);
        console.log("🗑️ Large file removed");
      } catch (unlinkError) {
        console.error("⚠️ Error removing large file:", unlinkError);
      }
      return res.status(400).json({ 
        error: "Arquivo muito grande. Máximo 10MB" 
      });
    }

    // Verify file exists after upload
    if (!fs.existsSync(file.filepath)) {
      console.error("❌ File does not exist after upload:", file.filepath);
      return res.status(500).json({ 
        error: "Erro ao salvar arquivo no servidor" 
      });
    }

    const filename = path.basename(file.filepath);
    const url = `/uploads/${filename}`;
    
    console.log("✅ Upload successful!");
    console.log("📍 File saved at:", file.filepath);
    console.log("🔗 Public URL:", url);
    console.log("📊 File size:", file.size, "bytes");

    return res.status(200).json({ 
      url,
      filename,
      size: file.size,
      mimetype: file.mimetype
    });

  } catch (error) {
    console.error("❌ Upload error (catch block):", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      return res.status(500).json({ 
        error: "Erro ao processar upload",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
    
    return res.status(500).json({ 
      error: "Erro ao processar upload. Tente novamente" 
    });
  }
}