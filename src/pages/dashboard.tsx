import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Layout } from "@/components/Layout";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useChartData } from "@/hooks/useChartData";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { Card } from "@/components/ui/card";

// Lazy load dos gráficos para melhor performance inicial
const FinancialCharts = dynamic(
  () => import("@/components/dashboard/FinancialCharts").then(mod => ({ default: mod.FinancialCharts })),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-64 animate-pulse bg-muted" />
        ))}
      </div>
    ),
    ssr: false
  }
);

// Skeleton otimizado para os cards
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

  const { 
    loading, 
    payments, 
    properties, 
    rentals, 
    tenantsCount, 
    locationExpenses, 
    exemptLocationIds 
  } = useDashboardData(
    selectedMonth,
    selectedYear,
    user?.id,
    user?.role
  );

  const handlePeriodChange = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  // Criar maps para lookup rápido (memoizado)
  const rentalMap = useMemo(() => new Map(rentals.map(r => [r.id, r])), [rentals]);
  const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const exemptSet = useMemo(() => new Set(exemptLocationIds), [exemptLocationIds]);

  // Calcular dados dos cards de visão geral de forma otimizada
  const overviewData = useMemo(() => {
    const totalProperties = properties.length;
    const availableProperties = properties.filter(p => p.status === 'available').length;
    const unavailableProperties = properties.filter(p => p.status === 'unavailable').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    
    const activeContracts = rentals.filter(r => r.isActive).length;
    
    const expiringContracts = rentals.filter(rental => {
      if (!rental.isActive || !rental.endDate) return false;
      const endDate = new Date(rental.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today && endDate <= twoMonthsFromNow;
    }).length;
    
    const todayStr = today.toISOString().split('T')[0];

    const dueTodayPayments = payments.filter(p => 
      p.status !== 'paid' && p.dueDate.split('T')[0] === todayStr
    ).length;

    const overduePayments = payments.filter(p => 
      p.status !== 'paid' && p.dueDate.split('T')[0] < todayStr
    );
    
    const overduePaymentsCount = overduePayments.length;
    const overdueAmount = overduePayments.reduce((acc, p) => acc + (p.expectedAmount || 0), 0);

    const completedPayments = payments.filter(p => p.status === 'paid').length;
    const expectedAmount = payments.reduce((acc, p) => acc + (p.expectedAmount || 0), 0);

    const occupancyRate = totalProperties > 0 ? (activeContracts / totalProperties) * 100 : 0;

    const grossRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const totalFees = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => {
        const rental = rentalMap.get(p.rentalId);
        if (!rental) return sum;
        
        const property = propertyMap.get(rental.propertyId);
        const isExempt = property?.locationId && exemptSet.has(property.locationId);
        const adminFee = isExempt ? 0 : (p.paidAmount || 0) * 0.05;
        const managementFee = (p.paidAmount || 0) * 0.03;
        
        return sum + adminFee + managementFee;
      }, 0);

    const totalFeesAndExpenses = totalFees + locationExpenses;
    const netRevenue = grossRevenue - totalFeesAndExpenses;

    return {
      totalProperties,
      availableProperties,
      unavailableProperties,
      occupancyRate,
      totalTenants: tenantsCount,
      activeContracts,
      expiringContracts,
      overduePayments: overduePaymentsCount,
      overdueAmount,
      dueTodayPayments,
      completedPayments,
      expectedAmount,
      totalRevenue: grossRevenue,
      grossRevenue,
      totalFeesAndExpenses,
      netRevenue,
    };
  }, [payments, properties, rentals, locationExpenses, tenantsCount, rentalMap, propertyMap, exemptSet]);

  // Hook separado para dados dos gráficos (carrega depois)
  const chartData = useChartData({
    payments,
    properties,
    selectedMonth,
    selectedYear,
    locationExpenses,
    exemptLocationIds,
    rentalMap,
    propertyMap
  });

  const userName = useMemo(() => 
    user?.name || user?.email?.split('@')[0] || "Usuário",
    [user]
  );

  return (
    <Layout>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <div className="p-4 md:p-6 space-y-6">
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

            <FinancialCharts
              monthlyRevenueData={chartData.monthlyRevenueData} 
              monthlyExpensesData={chartData.monthlyExpensesData} 
              occupancyData={chartData.occupancyPieData} 
            />
          </>
        )}
      </div>
    </Layout>
  );
}