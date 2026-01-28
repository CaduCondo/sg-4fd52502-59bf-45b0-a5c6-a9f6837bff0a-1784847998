import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "online" | "offline" | "checking";

export function useOnlineStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = async () => {
    setStatus("checking");
    setLastChecked(new Date());

    try {
      // Simple health check - try to fetch 1 record
      const { error } = await supabase
        .from("properties")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error && error.message.includes("<!DOCTYPE html>")) {
        // HTML error page = server down
        setStatus("offline");
        setRetryCount((prev) => prev + 1);
        return false;
      }

      setStatus("online");
      setRetryCount(0);
      return true;
    } catch (error) {
      setStatus("offline");
      setRetryCount((prev) => prev + 1);
      return false;
    }
  };

  useEffect(() => {
    // Initial check
    checkConnection();

    // Retry logic with exponential backoff
    const getRetryDelay = () => {
      const delays = [30000, 60000, 120000, 300000]; // 30s, 1m, 2m, 5m
      return delays[Math.min(retryCount, delays.length - 1)];
    };

    const intervalId = setInterval(() => {
      if (status === "offline") {
        checkConnection();
      }
    }, getRetryDelay());

    // Browser online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [status, retryCount]);

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
    isChecking: status === "checking",
    lastChecked,
    retryCount,
    checkConnection,
  };
}