import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true); // Status da rede (navegador)
  const [isServerReachable, setIsServerReachable] = useState(true); // Status da API (Supabase)
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = async () => {
    // Não marcar como checking se já estiver offline (evita loop visual)
    if (isOnline) {
      setIsChecking(true);
    }
    
    setLastChecked(new Date());

    try {
      // Verificar conexão com Supabase (health check leve)
      // Usando HEAD ou SELECT simples
      const { error } = await supabase
        .from("properties")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error && (error.message?.includes("<!DOCTYPE html>") || error.message?.includes("Failed to fetch"))) {
        // Erro de rede/servidor
        setIsServerReachable(false);
        setRetryCount((prev) => prev + 1);
        return false;
      }

      // Sucesso
      setIsServerReachable(true);
      setRetryCount(0);
      return true;
    } catch (error) {
      setIsServerReachable(false);
      setRetryCount((prev) => prev + 1);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Definir estado inicial baseado no navegador
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    // Listeners do navegador
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      // Se caiu a net, servidor também está inacessível tecnicamente, 
      // mas mantemos o estado anterior do servidor ou false
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Intervalo de verificação (heartbeat)
    // Aumentado para 30s para reduzir ruído em produção
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 30000);

    // Verificação inicial
    checkConnection();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return {
    isOnline,
    isServerReachable,
    isChecking,
    lastChecked,
    retryCount,
    checkConnection,
  };
}