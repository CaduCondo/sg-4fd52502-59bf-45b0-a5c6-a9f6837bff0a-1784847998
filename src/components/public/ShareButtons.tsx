import { Button } from "@/components/ui/button";
import { Share2, Facebook, MessageCircle, Mail, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonsProps {
  propertyName: string;
  propertyUrl: string;
}

export function ShareButtons({ propertyName, propertyUrl }: ShareButtonsProps) {
  const { toast } = useToast();
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${propertyUrl}` : propertyUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Link copiado!",
      description: "O link do imóvel foi copiado para a área de transferência.",
    });
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(`Confira este imóvel: ${propertyName}\n${fullUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Imóvel: ${propertyName}`);
    const body = encodeURIComponent(`Olá! Encontrei este imóvel que pode te interessar:\n\n${propertyName}\n${fullUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={shareViaWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareViaFacebook}>
          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareViaEmail}>
          <Mail className="h-4 w-4 mr-2 text-slate-600" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2 text-slate-600" />
          Copiar Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}