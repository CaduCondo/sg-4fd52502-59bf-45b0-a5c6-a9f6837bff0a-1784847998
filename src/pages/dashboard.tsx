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

  const { dashboardData, loading, error, refresh } = useDashboardData(selectedMonth, selectedYear);

  const handlePeriodChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  if (error) {
    return (
      <Layout>
        <SEO title="Dashboard - Gerenciador de Locações" />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados do dashboard: {error}
            </AlertDescription>
          </Alert>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </Layout>
    );
  }

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
            <OverviewCards data={dashboardData} />
            
            {/* Charts Section */}
            <AnalyticsCharts 
              revenueData={dashboardData?.revenueData}
              occupancyData={dashboardData?.occupancyData}
            />

            {/* Financial Charts - 6 Months */}
            <FinancialCharts
              monthlyRevenueData={dashboardData?.monthlyRevenueData}
              monthlyExpensesData={dashboardData?.monthlyExpensesData}
            />
          </>
        )}
      </div>
    </Layout>
  );
}