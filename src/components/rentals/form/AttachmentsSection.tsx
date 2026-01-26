import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Paperclip } from "lucide-react";
import { AttachmentViewer } from "@/components/AttachmentViewer";

interface AttachmentsSectionProps {
  attachments: string[];
  onUpload: (file: File) => Promise<void>;
  onRemove: (index: number) => void;
  isEditing: boolean;
}

export function AttachmentsSection({ attachments, onUpload, onRemove, isEditing }: AttachmentsSectionProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await onUpload(files[0]);
    // Reset input value to allow uploading same file again
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Anexos</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={!isEditing}
          >
            <Camera className="mr-2 h-4 w-4" />
            Tirar Foto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isEditing}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Anexar Arquivo
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {attachments.length > 0 && (
        <AttachmentViewer attachments={attachments} onRemove={onRemove} />
      )}
    </div>
  );
}