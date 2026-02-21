import { useState, useMemo, useCallback, Suspense } from "react";
import { Layout } from "@/components/Layout";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { FinancialCharts } from "@/components/dashboard/FinancialCharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { Card } from "@/components/ui/card";

const generateLast6Months = (month: number, year: number) => {
  const months = [];
  const currentDate = new Date(year, month - 1, 1);
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    months.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    });
  }
  
  return months;
};

// Skeleton para os cards
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(15)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
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

  const { loading, payments, properties, rentals, tenantsCount, locationExpenses, exemptLocationIds } = useDashboardData(
    selectedMonth,
    selectedYear,
    user?.id,
    user?.role
  );

  const handlePeriodChange = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);
  
  // Memoizar dados dos últimos 6 meses
  const last6MonthsData = useMemo(
    () => generateLast6Months(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );

  // Criar maps para lookup rápido
  const rentalMap = useMemo(() => new Map(rentals.map(r => [r.id, r])), [rentals]);
  const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const exemptSet = useMemo(() => new Set(exemptLocationIds), [exemptLocationIds]);

  // Calcular dados dos gráficos de forma otimizada
  const chartData = useMemo(() => {
    const isCurrentMonth = (month: number, year: number) => 
      month === selectedMonth && year === selectedYear;

    const getMonthPayments = (month: number, year: number) => 
      payments.filter(p => {
        if (p.status !== 'paid' || !p.paymentDate) return false;
        const pDate = new Date(p.paymentDate);
        return pDate.getMonth() + 1 === month && pDate.getFullYear() === year;
      });

    const calculateFees = (monthPayments: typeof payments) => 
      monthPayments.reduce((sum, p) => {
        const rental = rentalMap.get(p.rentalId);
        if (!rental) return sum;
        
        const property = propertyMap.get(rental.propertyId);
        const isExempt = property?.locationId && exemptSet.has(property.locationId);
        const adminFee = isExempt ? 0 : (p.paidAmount || 0) * 0.05;
        const managementFee = (p.paidAmount || 0) * 0.03;
        return sum + adminFee + managementFee;
      }, 0);

    const monthlyRevenueData = last6MonthsData.map(({ month, year, label }) => {
      const monthPayments = getMonthPayments(month, year);
      const bruta = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      const monthTaxas = calculateFees(monthPayments);
      const monthExpenses = isCurrentMonth(month, year) ? locationExpenses : 0;
      const liquida = bruta - monthTaxas - monthExpenses;
      
      return { month: label, bruta, liquida };
    });

    const monthlyExpensesData = last6MonthsData.map(({ month, year, label }) => {
      const monthPayments = getMonthPayments(month, year);
      const taxas = calculateFees(monthPayments);
      const contas = isCurrentMonth(month, year) ? locationExpenses : 0;
      
      return { month: label, taxas, contas };
    });

    const occupiedProps = properties.filter(p => p.status === 'occupied').length;
    const availableProps = properties.filter(p => p.status === 'available').length;
    const unavailableProps = properties.filter(p => p.status === 'unavailable').length;

    const occupancyPieData = [
      { name: 'Ocupados', value: occupiedProps, color: '#10b981' },
      { name: 'Disponíveis', value: availableProps, color: '#3b82f6' },
      { name: 'Indisponíveis', value: unavailableProps, color: '#ef4444' }
    ].filter(item => item.value > 0);

    return {
      monthlyRevenueData,
      monthlyExpensesData,
      occupancyPieData
    };
  }, [payments, properties, last6MonthsData, selectedMonth, selectedYear, rentalMap, propertyMap, exemptSet, locationExpenses]);
  
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

            <Suspense fallback={
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="h-64 animate-pulse bg-muted" />
                ))}
              </div>
            }>
              <FinancialCharts
                monthlyRevenueData={chartData.monthlyRevenueData} 
                monthlyExpensesData={chartData.monthlyExpensesData} 
                occupancyData={chartData.occupancyPieData} 
              />
            </Suspense>
          </>
        )}
      </div>
    </Layout>
  );
}