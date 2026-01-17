import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { forceCleanupNow } from "@/lib/forceCleanup";

// FORÇA LIMPEZA IMEDIATA DO LOCALSTORAGE (ID FANTASMA)
if (typeof window !== "undefined") {
  forceCleanupNow();
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
      <Toaster />
    </ThemeProvider>
  );
}