import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AttachmentViewerProps {
  attachments: string[];
  onRemove?: (index: number) => void;
  readOnly?: boolean;
}

export function AttachmentViewer({ attachments, onRemove, readOnly = false }: AttachmentViewerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);

  const handlePreview = (attachment: string) => {
    const isPdf = attachment.toLowerCase().endsWith(".pdf");
    setPreviewType(isPdf ? "pdf" : "image");
    setPreviewUrl(attachment);
  };

  const handleDownload = (attachment: string, index: number) => {
    const link = document.createElement("a");
    link.href = attachment;
    link.download = `arquivo_${index + 1}${attachment.substring(attachment.lastIndexOf("."))}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {attachments.map((attachment, index) => {
          const isPdf = attachment.toLowerCase().endsWith(".pdf");
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);

          return (
            <div
              key={index}
              className="relative border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-2">
                {/* Preview Thumbnail */}
                <div className="w-full h-24 flex items-center justify-center bg-muted rounded">
                  {isImage ? (
                    <img
                      src={attachment}
                      alt={`Anexo ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : isPdf ? (
                    <div className="text-red-500 font-bold text-2xl">PDF</div>
                  ) : (
                    <div className="text-muted-foreground text-sm">Arquivo</div>
                  )}
                </div>

                {/* File Name */}
                <p className="text-xs text-center text-muted-foreground truncate">
                  Arquivo {index + 1}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(attachment)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(attachment, index)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {!readOnly && onRemove && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onRemove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Anexo</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] flex items-center justify-center overflow-auto">
            {previewType === "image" && previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
            {previewType === "pdf" && previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}