import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Layout } from "@/components/Layout";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";

// Lazy load dos gráficos (não bloqueiam o carregamento inicial)
const FinancialCharts = dynamic(
  () => import("@/components/dashboard/FinancialCharts").then(mod => ({ default: mod.FinancialCharts })),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    ),
    ssr: false
  }
);

// Skeleton para os cards
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(15)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const { user } = useAuth();

  const { loading, counts, exemptLocationIds } = useDashboardData(
    selectedMonth,
    selectedYear,
    user?.id,
    user?.role
  );

  const handlePeriodChange = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const userName = useMemo(() => 
    user?.name || user?.email?.split('@')[0] || "Usuário",
    [user]
  );

  // Calcular dados para os cards (agora muito mais rápido - apenas cálculos simples)
  const overviewData = useMemo(() => {
    const totalProperties = counts.totalProperties;
    const occupiedProperties = counts.occupiedProperties;
    const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

    // Receita Bruta Recebida = soma dos valores pagos
    const grossRevenue = counts.grossRevenue;
    
    // Total Taxas e Contas = Taxa Admin + Taxa Gerenciamento + Contas do Local
    const totalFeesAndExpenses = counts.adminFees + counts.managementFees + counts.locationExpenses;
    
    // Receita Líquida = Receita Bruta - (Taxas + Contas)
    const netRevenue = grossRevenue - totalFeesAndExpenses;

    return {
      totalProperties: counts.totalProperties,
      availableProperties: counts.availableProperties,
      unavailableProperties: counts.unavailableProperties,
      occupancyRate,
      totalTenants: counts.totalTenants,
      activeContracts: counts.activeContracts,
      expiringContracts: counts.expiringContracts,
      overduePayments: counts.overduePayments,
      overdueAmount: counts.overdueAmount,
      dueTodayPayments: counts.dueTodayPayments,
      completedPayments: counts.completedPayments,
      expectedAmount: counts.expectedAmount,
      totalRevenue: grossRevenue,
      grossRevenue: grossRevenue,
      totalFeesAndExpenses,
      netRevenue,
      pendingPayments: counts.pendingPayments,
    };
  }, [counts, exemptLocationIds]);

  return (
    <Layout>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <div id="dashboard-page" className="p-4 md:p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do seu portfólio de locações
          </p>
        </div>
        <WelcomeCard userName={userName} />

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <OverviewCards 
              data={overviewData} 
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPeriodChange={handlePeriodChange}
              userRole={user?.role}
            />

            {/* Gráficos carregam depois (lazy) */}
            <FinancialCharts
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              userId={user?.id}
              userRole={user?.role}
            />
          </>
        )}
      </div>
    </Layout>
  );
}