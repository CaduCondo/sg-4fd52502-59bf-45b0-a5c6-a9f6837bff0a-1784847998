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
        title: (
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-destructive" />
            <span>Servidor offline</span>
          </div>
        ),
        description: `Usando dados salvos localmente. Tentando reconectar... (tentativa ${retryCount + 1})`,
        variant: "destructive",
        duration: Infinity,
      });
    } else if (isOnline && retryCount > 0) {
      // Was offline, now online
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <span>Conectado!</span>
          </div>
        ),
        description: "Servidor online. Sincronizando dados...",
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
        title: (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Conectando ao servidor...</span>
          </div>
        ),
        duration: 2000,
      });

      return () => {
        dismiss();
      };
    }
  }, [status, retryCount]);

  return null;
}