import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = async () => {
    if (isOnline) {
      setIsChecking(true);
    }
    
    setLastChecked(new Date());

    try {
      const { error } = await supabase
        .from("properties")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error && (error.message?.includes("<!DOCTYPE html>") || error.message?.includes("Failed to fetch"))) {
        setIsServerReachable(false);
        setRetryCount((prev) => prev + 1);
        return false;
      }

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
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // AJUSTADO: Intervalo aumentado de 30s para 5 minutos (300000ms)
    // para evitar refreshes durante preenchimento de formulários
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 300000); // 5 minutos

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