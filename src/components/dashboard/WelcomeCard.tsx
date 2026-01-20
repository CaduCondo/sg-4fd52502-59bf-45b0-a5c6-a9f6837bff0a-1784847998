import { Building2, TrendingUp } from "lucide-react";

interface WelcomeCardProps {
  greeting: string;
  userName: string;
}

export function WelcomeCard({ greeting, userName }: WelcomeCardProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Building2 className="h-12 w-12 text-white" />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Olá, {greeting.toLowerCase()} {userName}!
              <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-blue-100 mt-2">
              Bem-vindo(a) ao painel de controle de recebimentos das locações dos imóveis da D&apos;Uvo Enterprise Corporation
            </p>
          </div>
        </div>
        <TrendingUp className="h-16 w-16 text-white/80" />
      </div>
    </div>
  );
}