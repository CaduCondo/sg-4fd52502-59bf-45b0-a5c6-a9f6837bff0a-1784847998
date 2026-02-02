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

  const { loading, payments, properties, rentals, allowedLocationIds, locationExpenses, exemptLocationIds } = useDashboardData(
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
  
  // Gerar dados dos últimos 6 meses para os gráficos
  const last6MonthsData = useMemo(() => {
    const months = [];
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    
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
  }, [selectedMonth, selectedYear]);

  const chartData = useMemo(() => {
    console.log("📊 Gerando dados dos gráficos...");
    
    // Dados de receita mensal (últimos 6 meses)
    const revenueData = last6MonthsData.map(({ month, year, label }) => {
      const monthPayments = payments.filter(p => {
        const pDate = p.paymentDate ? new Date(p.paymentDate) : null;
        return pDate && 
               pDate.getMonth() + 1 === month && 
               pDate.getFullYear() === year &&
               p.status === 'paid';
      });
      
      const value = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      return { month: label, value };
    });

    // Dados de ocupação mensal (últimos 6 meses)
    const occupancyData = last6MonthsData.map(({ label }) => {
      const totalProps = properties.length;
      const occupiedProps = properties.filter(p => p.status === 'occupied').length;
      const rate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;
      return { month: label, rate };
    });

    // Dados financeiros detalhados (últimos 6 meses)
    const monthlyRevenueData = last6MonthsData.map(({ month, year, label }) => {
      const monthPayments = payments.filter(p => {
        const pDate = p.paymentDate ? new Date(p.paymentDate) : null;
        return pDate && 
               pDate.getMonth() + 1 === month && 
               pDate.getFullYear() === year &&
               p.status === 'paid';
      });
      
      const bruta = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      
      // Calcular taxas do mês
      const monthTaxas = monthPayments.reduce((sum, p) => {
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = properties.find(prop => prop.id === rental?.propertyId);
        const isExempt = property?.locationId && exemptLocationIds.includes(property.locationId);
        const adminFee = isExempt ? 0 : (p.paidAmount || 0) * 0.05;
        const managementFee = (p.paidAmount || 0) * 0.03;
        return sum + adminFee + managementFee;
      }, 0);

      // Buscar despesas do mês (location_expenses)
      // Nota: locationExpenses vem do hook useDashboardData baseado no período selecionado
      // Para gráficos históricos, precisaríamos buscar despesas de cada mês individualmente
      // Por ora, vamos usar 0 para meses anteriores e locationExpenses para o mês atual
      const isCurrentMonth = month === selectedMonth && year === selectedYear;
      const monthExpenses = isCurrentMonth ? locationExpenses : 0;
      
      const liquida = bruta - monthTaxas - monthExpenses;
      
      return { month: label, bruta, liquida };
    });

    // Dados de despesas mensais (últimos 6 meses)
    const monthlyExpensesData = last6MonthsData.map(({ month, year, label }) => {
      const monthPayments = payments.filter(p => {
        const pDate = p.paymentDate ? new Date(p.paymentDate) : null;
        return pDate && 
               pDate.getMonth() + 1 === month && 
               pDate.getFullYear() === year &&
               p.status === 'paid';
      });
      
      const taxas = monthPayments.reduce((sum, p) => {
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = properties.find(prop => prop.id === rental?.propertyId);
        const isExempt = property?.locationId && exemptLocationIds.includes(property.locationId);
        const adminFee = isExempt ? 0 : (p.paidAmount || 0) * 0.05;
        const managementFee = (p.paidAmount || 0) * 0.03;
        return sum + adminFee + managementFee;
      }, 0);

      const isCurrentMonth = month === selectedMonth && year === selectedYear;
      const contas = isCurrentMonth ? locationExpenses : 0;
      
      return { month: label, taxas, contas };
    });

    // Dados de distribuição de imóveis (atual)
    const occupancyPieData = [
      { 
        name: 'Ocupados', 
        value: properties.filter(p => p.status === 'occupied').length,
        color: '#10b981' // green
      },
      { 
        name: 'Disponíveis', 
        value: properties.filter(p => p.status === 'available').length,
        color: '#3b82f6' // blue
      },
      { 
        name: 'Indisponíveis', 
        value: properties.filter(p => p.status === 'unavailable').length,
        color: '#ef4444' // red
      }
    ].filter(item => item.value > 0); // Remove categorias com 0 imóveis

    return {
      revenueData,
      occupancyData,
      monthlyRevenueData,
      monthlyExpensesData,
      occupancyPieData
    };
  }, [payments, properties, rentals, locationExpenses, exemptLocationIds, last6MonthsData, selectedMonth, selectedYear]);
  
  const overviewData = useMemo(() => {
    console.log("📊 Recalculando overviewData...");
    console.log("🔢 Calculando overviewData...", {
      paymentsCount: payments.length,
      propertiesCount: properties.length,
      rentalsCount: rentals.length,
      locationExpenses
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

    const grossRevenue = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const totalFees = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => {
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = properties.find(prop => prop.id === rental?.propertyId);
        
        // Taxa de Administração: 5% (isenta para locais marcados)
        const isExempt = property?.locationId && exemptLocationIds.includes(property.locationId);
        const adminFee = isExempt ? 0 : (p.paidAmount || 0) * 0.05;
        
        // Taxa de Gerenciamento: 3% (SEMPRE cobra, sem isenção)
        const managementFee = (p.paidAmount || 0) * 0.03;
        
        return sum + adminFee + managementFee;
      }, 0);

    const totalFeesAndExpenses = totalFees + locationExpenses;
    const netRevenue = grossRevenue - totalFeesAndExpenses;

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
      grossRevenue,
      totalFeesAndExpenses,
      netRevenue,
    };
  }, [payments, properties, rentals, locationExpenses]);

  return (
    <Layout>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <div className="p-4 md:p-6 space-y-6">
        <WelcomeCard userName={user?.name || user?.email?.split('@')[0] || "Usuário"} />

        {loading ? (
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
        ) : (
          <>
            <OverviewCards 
              data={overviewData} 
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPeriodChange={handlePeriodChange}
              exemptLocationIds={exemptLocationIds}
            />
            
            <AnalyticsCharts 
              revenueData={chartData.revenueData} 
              occupancyData={chartData.occupancyData} 
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