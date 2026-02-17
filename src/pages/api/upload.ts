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
  // Add CORS headers for mobile browsers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("[API Upload] Starting file upload...");
  console.log("[API Upload] Request headers:", req.headers);

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log("[API Upload] Created upload directory:", uploadDir);
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 15 * 1024 * 1024, // Increased to 15MB for mobile photos
      filename: (name, ext, part) => {
        const uniqueName = `${part.name || "file"}_${Date.now()}${ext}`;
        console.log("[API Upload] Generated filename:", uniqueName);
        return uniqueName;
      },
    });

    console.log("[API Upload] Parsing form data...");
    const [fields, files] = await form.parse(req);
    console.log("[API Upload] Form parsed successfully");
    console.log("[API Upload] Files received:", Object.keys(files));

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      console.error("[API Upload] No file in request");
      return res.status(400).json({ error: "Missing file in request" });
    }

    const file = fileArray[0];
    console.log("[API Upload] File details:", {
      originalName: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath,
    });

    const fileName = path.basename(file.filepath);
    const fileUrl = `/uploads/${fileName}`;

    console.log("[API Upload] Upload successful:", fileUrl);
    return res.status(200).json({ url: fileUrl });
  } catch (error: any) {
    console.error("[API Upload] Error uploading file:", error);
    console.error("[API Upload] Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return res.status(500).json({ 
      error: "Error uploading file",
      details: error.message 
    });
  }
}