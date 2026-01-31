import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { FinancialCharts } from "@/components/dashboard/FinancialCharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";

export default function Dashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const { user } = useAuth();

  const { loading, payments, properties, rentals, allowedLocationIds } = useDashboardData(
    selectedMonth,
    selectedYear,
    user?.id,
    user?.role
  );

  const handlePeriodChange = (month: number, year: number) => {
    console.log("📅 Mudando período:", { month, year });
    setSelectedMonth(month);
    setSelectedYear(year);
  };
  
  // Calcular overviewData apenas quando os dados mudarem
  const overviewData = useMemo(() => {
    console.log("🔢 Calculando overviewData...", { 
      paymentsCount: payments.length, 
      propertiesCount: properties.length, 
      rentalsCount: rentals.length 
    });

    const totalProperties = properties.length;
    const availableProperties = properties.filter(p => p.status === 'available').length;
    const rentedProperties = properties.filter(p => p.status === 'occupied').length;
    const unavailableProperties = properties.filter(p => p.status === 'unavailable').length;
    
    const totalTenants = new Set(rentals.map(r => r.tenantId)).size;
    const activeContracts = rentals.filter(r => r.isActive).length;
    
    const totalRevenue = payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overduePaymentsList = payments.filter(p => {
      if (p.status === 'paid') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate < today;
    });

    const overduePayments = overduePaymentsList.length;
    const overdueAmount = overduePaymentsList.reduce((acc, p) => acc + (p.expectedAmount || 0), 0);

    const dueTodayPayments = payments.filter(p => {
      if (p.status === 'paid') return false;
      const dueDate = new Date(p.dueDate);
      const pDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      return pDate.getTime() === today.getTime();
    }).length;

    const completedPayments = payments.filter(p => p.status === 'paid').length;
    const expectedAmount = payments.reduce((acc, p) => acc + (p.expectedAmount || 0), 0);

    const occupancyRate = totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0;

    return {
      totalProperties,
      availableProperties,
      rentedProperties,
      unavailableProperties,
      occupancyRate,
      totalTenants,
      activeContracts,
      overduePayments,
      overdueAmount,
      dueTodayPayments,
      completedPayments,
      expectedAmount,
      totalRevenue,
      grossRevenue: totalRevenue,
      totalFeesAndExpenses: 0,
      netRevenue: totalRevenue,
    };
  }, [payments, properties, rentals]);

  return (
    <Layout>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <div className="p-6 space-y-8">
        <WelcomeCard userName={user?.name || user?.email?.split('@')[0] || "Usuário"} />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <PeriodSelector 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
            onPeriodChange={handlePeriodChange} 
          />
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(15)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <OverviewCards data={overviewData} />
            
            <AnalyticsCharts 
              revenueData={[]} 
              occupancyData={[]} 
            />

            <FinancialCharts
              monthlyRevenueData={[]} 
              monthlyExpensesData={[]} 
              occupancyData={[]} 
            />
          </>
        )}
      </div>
    </Layout>
  );
}