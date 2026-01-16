import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, FileText, X } from "lucide-react";

interface AttachmentViewerProps {
  attachments: string[];
  onRemove?: (index: number) => void;
  readOnly?: boolean;
}

export function AttachmentViewer({ attachments, onRemove, readOnly = false }: AttachmentViewerProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const getFileType = (base64String: string): string => {
    if (base64String.startsWith("data:image/")) return "image";
    if (base64String.startsWith("data:application/pdf")) return "pdf";
    return "file";
  };

  const handleView = (attachment: string) => {
    setSelectedAttachment(attachment);
    setPreviewOpen(true);
  };

  const handleDownload = (attachment: string, index: number) => {
    const fileType = getFileType(attachment);
    let extension = "bin";
    
    if (fileType === "image") {
      if (attachment.includes("image/png")) extension = "png";
      else if (attachment.includes("image/jpeg") || attachment.includes("image/jpg")) extension = "jpg";
      else if (attachment.includes("image/gif")) extension = "gif";
      else if (attachment.includes("image/webp")) extension = "webp";
    } else if (fileType === "pdf") {
      extension = "pdf";
    }

    const link = document.createElement("a");
    link.href = attachment;
    link.download = `anexo_${index + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-medium mb-2">
          Anexos ({attachments.length})
        </div>
        {attachments.map((attachment, index) => {
          const fileType = getFileType(attachment);
          
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fileType === "image" ? (
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-200">
                    <img 
                      src={attachment} 
                      alt={`Anexo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded flex items-center justify-center bg-slate-200 flex-shrink-0">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <span className="text-sm truncate">
                  {fileType === "image" ? "Imagem" : fileType === "pdf" ? "PDF" : "Arquivo"} {index + 1}
                </span>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {fileType === "image" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(attachment)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment, index)}
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!readOnly && onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(index)}
                    title="Remover"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Anexo</DialogTitle>
          </DialogHeader>
          {selectedAttachment && (
            <div className="flex items-center justify-center p-4">
              <img 
                src={selectedAttachment} 
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}