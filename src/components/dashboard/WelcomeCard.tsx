import { Building2, TrendingUp } from "lucide-react";
import { useState, useEffect, memo } from "react";

interface WelcomeCardProps {
  userName: string;
}

export const WelcomeCard = memo(function WelcomeCard({ userName }: WelcomeCardProps) {
  const [greeting, setGreeting] = useState("Olá");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Bom dia");
    } else if (hour < 18) {
      setGreeting("Boa tarde");
    } else {
      setGreeting("Boa noite");
    }
  }, []);

  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-5 sm:p-6 lg:p-8 text-white shadow-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4 flex-1">
            <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl backdrop-blur-sm flex-shrink-0">
              <Building2 className="h-7 w-7 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 mb-2 flex-wrap">
                <span className="break-words">
                  {mounted ? greeting : "Olá"}, {userName}!
                </span>
                <span className="inline-block animate-wave text-2xl sm:text-3xl">👋</span>
              </h1>
              <p className="text-blue-50 text-sm sm:text-base leading-relaxed">
                Bem-vindo(a) ao painel de controle de recebimentos das locações dos imóveis da <span className="font-semibold">D&apos;Uvo Enterprise</span>
              </p>
            </div>
          </div>
          
          <div className="hidden sm:block flex-shrink-0 opacity-20 sm:opacity-30">
            <TrendingUp className="h-12 w-12 lg:h-16 lg:w-16" />
          </div>
        </div>
      </div>
    </div>
  );
});