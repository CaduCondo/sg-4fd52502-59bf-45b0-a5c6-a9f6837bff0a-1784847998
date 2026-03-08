import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, FileText, ImageIcon, Loader2 } from "lucide-react";

interface Attachment {
  url: string;
  name: string;
  description?: string;
  uploadProgress?: number;
}

interface PaymentAttachmentsProps {
  attachments: Attachment[];
  uploadingFile: boolean;
  uploadProgress: { [key: number]: number };
  isReadOnly: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, index: number) => Promise<void>;
  onRemoveAttachment: (index: number) => void;
  onAddAttachment: () => void;
}

export const PaymentAttachments = memo(function PaymentAttachments({
  attachments,
  uploadingFile,
  uploadProgress,
  isReadOnly,
  onFileChange,
  onRemoveAttachment,
  onAddAttachment,
}: PaymentAttachmentsProps) {
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = attachments.findIndex(a => !a.url);
    if (index === -1) {
      onAddAttachment();
      setTimeout(() => onFileChange(e, attachments.length), 0);
    } else {
      onFileChange(e, index);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            id="file-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={handleFileInputChange}
            disabled={uploadingFile || isReadOnly}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('file-input')?.click();
            }}
            disabled={uploadingFile || isReadOnly}
          >
            <Upload className="mr-2 h-5 w-5" />
            Escolher Arquivo
          </Button>
        </div>

        <div className="flex-1 sm:hidden">
          <input
            id="camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            disabled={uploadingFile || isReadOnly}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('camera-input')?.click();
            }}
            disabled={uploadingFile || isReadOnly}
          >
            <Camera className="mr-2 h-5 w-5" />
            Tirar Foto
          </Button>
        </div>
      </div>

      {attachments.filter(a => a.url).length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium text-muted-foreground">
            Arquivos Anexados ({attachments.filter(a => a.url).length})
          </p>
          {attachments.map((attachment, index) => {
            if (!attachment.url) return null;
            
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <div className="flex-shrink-0">
                  {attachment.url.toLowerCase().endsWith(".pdf") ? (
                    <FileText className="h-8 w-8 text-primary" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.name || "Arquivo"}
                  </p>
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Visualizar →
                  </a>
                </div>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveAttachment(index)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([key, progress]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enviando... {progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});