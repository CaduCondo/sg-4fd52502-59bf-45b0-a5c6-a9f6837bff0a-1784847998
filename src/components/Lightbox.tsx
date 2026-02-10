import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LightboxProps {
  files: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ files, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentFile = files[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        handlePrevious();
      } else if (e.key === "ArrowRight" && currentIndex < files.length - 1) {
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [currentIndex, files.length, onClose]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentFile.url;
    link.download = currentFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  const isImage = currentFile.type.startsWith("image/");
  const isPDF = currentFile.type === "application/pdf";

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={handleClose}
    >
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-white">
            <p className="font-semibold">{currentFile.name}</p>
            <p className="text-sm text-slate-300">
              {currentIndex + 1} de {files.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDownload();
              }}
            >
              <Download size={20} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
            >
              <X size={20} />
            </Button>
          </div>
        </div>
      </div>

      {files.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 z-10"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePrevious();
            }}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={32} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 z-10"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleNext();
            }}
            disabled={currentIndex === files.length - 1}
          >
            <ChevronRight size={32} />
          </Button>
        </>
      )}

      <div 
        className="max-w-[95vw] max-h-[85vh] w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={currentFile.url}
              alt={currentFile.name}
              className="max-w-full max-h-full object-contain"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        ) : isPDF ? (
          <iframe
            src={currentFile.url}
            className="w-full h-full bg-white rounded-lg"
            title={currentFile.name}
          />
        ) : (
          <div className="text-center text-white">
            <p className="mb-4">Pré-visualização não disponível para este tipo de arquivo</p>
            <Button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download size={18} className="mr-2" />
              Baixar Arquivo
            </Button>
          </div>
        )}
      </div>

      {files.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-10">
          <div className="flex items-center justify-center space-x-2 overflow-x-auto max-w-7xl mx-auto">
            {files.map((file, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${
                  index === currentIndex
                    ? "border-blue-500 scale-110"
                    : "border-white/30 hover:border-white/60"
                }`}
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-700 rounded flex items-center justify-center text-white text-xs">
                    {file.name.split(".").pop()?.toUpperCase()}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}