import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { validateAndCleanLocalStorage, forceCleanLocalStorage } from "@/lib/localStorageGuard";

export default function App({ Component, pageProps }: AppProps) {
  // MIDDLEWARE DE PROTEÇÃO: Valida localStorage em TODA carga de página
  useEffect(() => {
    console.log("🚀 App iniciando, ativando LocalStorage Guard...");
    
    // Executar validação imediatamente
    validateAndCleanLocalStorage().then((isValid) => {
      if (!isValid) {
        console.log("⚠️ LocalStorage inválido detectado!");
        console.log("🔄 Usuário será redirecionado para login na próxima navegação");
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