import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/use-toast";

export function ConnectionStatusToast() {
  const { isOnline, isServerReachable } = useOnlineStatus();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | undefined>();
  const reconnectAttemptsRef = useRef(0);
  const lastStatusRef = useRef({ isOnline: true, isServerReachable: true });
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Limpar timer anterior se existir
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce: aguardar 2 segundos antes de mostrar qualquer toast
    debounceTimerRef.current = setTimeout(() => {
      const currentStatus = { isOnline, isServerReachable };
      const lastStatus = lastStatusRef.current;

      // Só atualizar se o status realmente mudou
      const statusChanged = 
        currentStatus.isOnline !== lastStatus.isOnline ||
        currentStatus.isServerReachable !== lastStatus.isServerReachable;

      if (!statusChanged) {
        return;
      }

      // Atualizar referência do status anterior
      lastStatusRef.current = currentStatus;

      // Dismiss toast anterior se existir
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }

      // Offline (sem internet)
      if (!isOnline) {
        reconnectAttemptsRef.current = 0;
        const { id } = toast({
          title: "Sem conexão com a internet",
          description: "Verifique sua conexão e tente novamente.",
          variant: "destructive",
          duration: Infinity,
        });
        toastIdRef.current = id;
        return;
      }

      // Online mas servidor inacessível
      if (isOnline && !isServerReachable) {
        reconnectAttemptsRef.current += 1;

        // Limitar tentativas de reconexão para evitar loop infinito
        if (reconnectAttemptsRef.current > 3) {
          const { id } = toast({
            title: "Servidor temporariamente indisponível",
            description: "Recarregue a página em alguns instantes.",
            variant: "destructive",
            duration: 10000, // 10 segundos
          });
          toastIdRef.current = id;
          return;
        }

        const { id } = toast({
          title: "Conectando...",
          description: "Verificando status do servidor",
          duration: 5000, // 5 segundos
        });
        toastIdRef.current = id;
        return;
      }

      // Reconectado com sucesso
      if (isOnline && isServerReachable && reconnectAttemptsRef.current > 0) {
        reconnectAttemptsRef.current = 0;
        const { id } = toast({
          title: "Conexão restabelecida",
          description: "Você está online novamente.",
          variant: "default",
          duration: 3000,
        });
        toastIdRef.current = id;
      }
    }, 2000); // Debounce de 2 segundos

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOnline, isServerReachable, toast, dismiss]);

  return null;
}