import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    const phoneNumber = "5511976543210"; // (11) 97654-3210 em formato internacional
    const message = encodeURIComponent("Olá! Gostaria de mais informações sobre os imóveis disponíveis.");
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank");
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-green-500 shadow-2xl hover:bg-green-600 hover:scale-110 transition-all duration-300 animate-bounce"
      aria-label="Fale conosco no WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </Button>
  );
}