import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { useDashboardData, type Period } from "@/hooks/useDashboardData";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  
  const { metrics, chartData, loading, refresh } = useDashboardData(period);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Olá");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
  }, []);

  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">Carregando...</div>
      </Layout>
    );
  }

  return (
    <>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <Layout>
        <div className="space-y-6">
          <WelcomeCard 
            greeting={greeting} 
            userName={user?.name?.split(" ")[0] || "Usuário"} 
          />

          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
          />

          <OverviewCards 
            metrics={metrics}
            loading={loading}
          />

          <AnalyticsCharts
            chartData={chartData}
            loading={loading}
          />
        </div>
      </Layout>
    </>
  );
}