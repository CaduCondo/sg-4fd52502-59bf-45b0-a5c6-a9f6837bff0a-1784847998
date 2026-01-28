import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function ConnectionStatusToast() {
  const { status, isOnline, isOffline, retryCount } = useOnlineStatus();
  const { toast, dismiss } = useToast();

  useEffect(() => {
    let toastId: any;

    if (isOffline) {
      toastId = toast({
        title: "Servidor offline",
        description: `Usando dados locais. Tentando reconectar... (${retryCount + 1})`,
        variant: "destructive",
        duration: Infinity,
      });
    } else if (isOnline && retryCount > 0) {
      // Was offline, now online
      toast({
        title: "Conectado!",
        description: "Sincronizando dados...",
        variant: "default",
        duration: 3000,
      });
    }

    return () => {
      if (toastId) {
        dismiss();
      }
    };
  }, [status, retryCount]);

  // Show checking status on initial load
  useEffect(() => {
    if (status === "checking" && retryCount === 0) {
      const toastId = toast({
        title: "Conectando...",
        description: "Verificando status do servidor",
        duration: 2000,
      });

      return () => {
        dismiss();
      };
    }
  }, [status, retryCount]);

  return null;
}