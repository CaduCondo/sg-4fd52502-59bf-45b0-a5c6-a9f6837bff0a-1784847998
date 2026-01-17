import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { validateAndCleanLocalStorage, checkBlacklistSync } from "@/lib/localStorageGuard";

export default function App({ Component, pageProps }: AppProps) {
  // PROTEÇÃO SÍNCRONA: Verifica blacklist IMEDIATAMENTE
  if (typeof window !== "undefined") {
    const isClean = checkBlacklistSync();
    if (!isClean) {
      console.log("🚨 ID BLACKLISTED detectado! Redirecionando...");
      // O redirect já foi feito dentro do checkBlacklistSync
      return null; // Não renderiza nada
    }
  }

  // MIDDLEWARE DE PROTEÇÃO: Valida localStorage em TODA carga de página
  useEffect(() => {
    console.log("🚀 App iniciando, ativando LocalStorage Guard...");
    
    // Executar validação imediatamente
    validateAndCleanLocalStorage().then((isValid) => {
      if (!isValid) {
        console.log("⚠️ LocalStorage inválido detectado!");
        console.log("🔄 Redirecionando para login...");
        window.location.href = "/login";
      } else {
        console.log("✅ LocalStorage válido, app carregando normalmente");
      }
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
      <Toaster />
    </ThemeProvider>
  );
}