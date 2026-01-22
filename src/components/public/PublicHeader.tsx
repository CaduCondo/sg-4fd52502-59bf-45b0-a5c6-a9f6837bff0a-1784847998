import Link from "next/link";
import { Building2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Imóveis Premium
              </h1>
              <p className="text-xs text-slate-600">Seu novo lar está aqui</p>
            </div>
          </div>

          <Link href="/login">
            <Button
              variant="outline"
              className="gap-2 border-slate-300 hover:bg-slate-50"
            >
              <LogIn className="h-4 w-4" />
              Gerenciador
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}