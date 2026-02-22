import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Inicializar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Attachment {
  url?: string;
  name?: string;
}

interface Payment {
  id: string;
  attachments: Attachment[] | string[];
}

/**
 * Script de migração de anexos de pagamentos
 * Move arquivos de public/uploads/ para Supabase Storage
 * e atualiza as URLs no banco de dados
 */
async function migrateAttachments() {
  console.log("🚀 Iniciando migração de anexos...\n");

  try {
    // 1. Buscar todos os pagamentos com anexos
    console.log("📋 Buscando pagamentos com anexos...");
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("id, attachments")
      .not("attachments", "is", null)
      .neq("attachments", "[]");

    if (fetchError) {
      throw new Error(`Erro ao buscar pagamentos: ${fetchError.message}`);
    }

    if (!payments || payments.length === 0) {
      console.log("✅ Nenhum pagamento com anexos encontrado.");
      return;
    }

    console.log(`📦 Encontrados ${payments.length} pagamentos com anexos\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Processar cada pagamento
    for (const payment of payments as Payment[]) {
      console.log(`\n📄 Processando pagamento ${payment.id}...`);

      const attachments = Array.isArray(payment.attachments) 
        ? payment.attachments 
        : [];

      const newAttachments: Attachment[] = [];
      let needsUpdate = false;

      // 3. Processar cada anexo
      for (const attachment of attachments) {
        let attachmentUrl: string;
        let attachmentName: string | undefined;

        // Extrair URL do anexo (pode ser string ou objeto)
        if (typeof attachment === "string") {
          attachmentUrl = attachment;
        } else if (attachment && typeof attachment === "object") {
          attachmentUrl = attachment.url || "";
          attachmentName = attachment.name;
        } else {
          continue;
        }

        // 4. Verificar se é URL antiga (relativa /uploads/...)
        if (attachmentUrl.startsWith("/uploads/")) {
          needsUpdate = true;
          console.log(`  🔄 Migrando: ${attachmentUrl}`);

          try {
            // 5. Ler arquivo local
            const localFilePath = path.join(process.cwd(), "public", attachmentUrl);
            
            if (!fs.existsSync(localFilePath)) {
              console.log(`  ⚠️  Arquivo não encontrado localmente: ${localFilePath}`);
              console.log(`  ⏭️  Mantendo URL original (pode estar no Supabase)`);
              newAttachments.push(
                attachmentName 
                  ? { url: attachmentUrl, name: attachmentName }
                  : { url: attachmentUrl, name: path.basename(attachmentUrl) }
              );
              skippedCount++;
              continue;
            }

            const fileBuffer = fs.readFileSync(localFilePath);
            const fileName = path.basename(attachmentUrl);
            const fileExt = path.extname(fileName);
            
            // 6. Gerar novo nome único
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 15);
            const newFileName = `${timestamp}_${randomStr}${fileExt}`;
            const storagePath = `payment-attachments/${newFileName}`;

            // 7. Upload para Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("uploads")
              .upload(storagePath, fileBuffer, {
                contentType: getMimeType(fileExt),
                upsert: false,
              });

            if (uploadError) {
              console.log(`  ❌ Erro ao fazer upload: ${uploadError.message}`);
              // Manter URL original em caso de erro
              newAttachments.push(
                attachmentName 
                  ? { url: attachmentUrl, name: attachmentName }
                  : { url: attachmentUrl, name: fileName }
              );
              errorCount++;
              continue;
            }

            // 8. Obter URL pública
            const { data: publicUrlData } = supabase.storage
              .from("uploads")
              .getPublicUrl(storagePath);

            if (!publicUrlData?.publicUrl) {
              console.log(`  ❌ Erro ao obter URL pública`);
              newAttachments.push(
                attachmentName 
                  ? { url: attachmentUrl, name: attachmentName }
                  : { url: attachmentUrl, name: fileName }
              );
              errorCount++;
              continue;
            }

            const newUrl = publicUrlData.publicUrl;
            console.log(`  ✅ Migrado com sucesso!`);
            console.log(`     Antiga: ${attachmentUrl}`);
            console.log(`     Nova: ${newUrl}`);

            newAttachments.push({
              url: newUrl,
              name: attachmentName || fileName,
            });

            migratedCount++;

          } catch (error) {
            console.log(`  ❌ Erro ao processar anexo: ${error}`);
            newAttachments.push(
              attachmentName 
                ? { url: attachmentUrl, name: attachmentName }
                : { url: attachmentUrl, name: path.basename(attachmentUrl) }
            );
            errorCount++;
          }
        } else {
          // URL já está correta (começa com https://)
          console.log(`  ✅ URL já migrada: ${attachmentUrl.substring(0, 50)}...`);
          newAttachments.push(
            attachmentName 
              ? { url: attachmentUrl, name: attachmentName }
              : { url: attachmentUrl, name: "arquivo" }
          );
        }
      }

      // 9. Atualizar banco de dados se necessário
      if (needsUpdate && newAttachments.length > 0) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({ attachments: newAttachments })
          .eq("id", payment.id);

        if (updateError) {
          console.log(`  ❌ Erro ao atualizar banco: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`  💾 Banco de dados atualizado com sucesso!`);
        }
      }
    }

    // 10. Resumo da migração
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO DA MIGRAÇÃO");
    console.log("=".repeat(60));
    console.log(`✅ Anexos migrados com sucesso: ${migratedCount}`);
    console.log(`⏭️  Anexos ignorados (não encontrados): ${skippedCount}`);
    console.log(`❌ Erros durante migração: ${errorCount}`);
    console.log(`📦 Total de pagamentos processados: ${payments.length}`);
    console.log("=".repeat(60));

    if (migratedCount > 0) {
      console.log("\n✨ Migração concluída com sucesso!");
      console.log("💡 Os arquivos antigos em public/uploads/ podem ser removidos manualmente.");
    } else {
      console.log("\n✅ Todos os anexos já estavam migrados!");
    }

  } catch (error) {
    console.error("\n❌ Erro fatal durante migração:", error);
    process.exit(1);
  }
}

/**
 * Determina o MIME type baseado na extensão do arquivo
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
}

// Executar migração
migrateAttachments();