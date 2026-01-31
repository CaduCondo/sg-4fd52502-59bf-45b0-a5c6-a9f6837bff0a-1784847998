import { useState } from "react";
import { Layout } from "@/components/Layout";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { FinancialCharts } from "@/components/dashboard/FinancialCharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";

export default function Dashboard() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const { user } = useAuth();

  const { 
    payments, 
    properties, 
    rentals, 
    allowedLocationIds,
    loading 
  } = useDashboardData({ month: selectedMonth, year: selectedYear });

  const handlePeriodChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };
  
  const overviewData = {
    totalRevenue: payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0),
    totalProperties: properties.length,
    occupiedProperties: rentals.filter(r => r.isActive).length,
    totalTenants: new Set(rentals.map(r => r.tenantId)).size,
    payments,
    properties,
    rentals
  };

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