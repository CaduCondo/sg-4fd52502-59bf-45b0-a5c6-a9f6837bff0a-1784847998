import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState(30);
  const { dashboardData, loading, error } = useDashboardData(period);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-destructive">Erro ao carregar dados do dashboard</p>
        </div>
      </Layout>
    );
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header com boas-vindas e seletor de período */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <WelcomeCard userName={user?.user_metadata?.name || user?.email || "Usuário"} />
          <PeriodSelector period={period} onPeriodChange={setPeriod} />
        </div>

        {/* Cards de métricas */}
        <OverviewCards data={dashboardData} />

        {/* Gráficos e análises */}
        <AnalyticsCharts data={dashboardData} period={period} />
      </div>
    </Layout>
  );
}