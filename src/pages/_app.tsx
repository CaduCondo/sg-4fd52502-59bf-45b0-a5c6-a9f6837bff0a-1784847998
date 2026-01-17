import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { validateAndCleanLocalStorage, checkBlacklistSync } from "@/lib/localStorageGuard";

export default function App({ Component, pageProps }: AppProps) {
  // 1. HOOKS PRIMEIRO (Para satisfazer regras do React)
  // MIDDLEWARE DE PROTEÇÃO: Valida localStorage em TODA carga de página
  useEffect(() => {
    console.log("🚀 App iniciando, ativando LocalStorage Guard...");
    
    // Executar validação async
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

  // 2. PROTEÇÃO SÍNCRONA DEPOIS DOS HOOKS
  // Verifica blacklist IMEDIATAMENTE antes de renderizar conteúdo
  if (typeof window !== "undefined") {
    const isClean = checkBlacklistSync();
    if (!isClean) {
      console.log("🚨 ID BLACKLISTED detectado! Bloqueando renderização...");
      // Retorna null para não renderizar nada enquanto redireciona
      // Como os hooks já foram chamados acima, isso é válido
      return null;
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
      <Toaster />
    </ThemeProvider>
  );
}