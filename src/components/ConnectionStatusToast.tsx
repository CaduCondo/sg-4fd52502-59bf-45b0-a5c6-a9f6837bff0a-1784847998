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

    // Debounce: aguardar 5 segundos antes de mostrar qualquer toast
    // Aumentado de 2s para 5s para evitar falsos positivos
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
        // Aumentado de 3 para 5 tentativas antes de mostrar erro
        if (reconnectAttemptsRef.current > 5) {
          const { id } = toast({
            title: "Servidor temporariamente indisponível",
            description: "O sistema continuará funcionando. Recarregue a página em alguns instantes se necessário.",
            variant: "default", // Mudado de destructive para default (menos alarmante)
            duration: 10000, // 10 segundos
          });
          toastIdRef.current = id;
          return;
        }

        // Não mostrar toast nas primeiras tentativas
        // Deixa o sistema funcionar normalmente
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
    }, 5000); // Debounce aumentado de 2s para 5s

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOnline, isServerReachable, toast, dismiss]);

  return null;
}