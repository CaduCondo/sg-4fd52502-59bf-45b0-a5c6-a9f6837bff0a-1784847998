import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cacheService } from "@/services/cacheService";

export type Period = "week" | "month" | "year";

export interface DashboardMetrics {
  totalProperties: number;
  availableProperties: number;
  occupiedProperties: number;
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  activeRentals: number;
  monthlyRevenue: number;
  overduePayments: number;
  overdueAmount: number;
  paidPayments: number;
  paidAmount: number;
  occupancyRate: number;
}

export interface ChartData {
  revenueByMonth: Array<{ month: string; value: number }>;
  paymentsByStatus: Array<{ status: string; count: number; amount: number }>;
  propertiesByStatus: Array<{ status: string; count: number }>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos (mais frequente para dashboard)

export function useDashboardData(period: Period = "month") {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProperties: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    activeRentals: 0,
    monthlyRevenue: 0,
    overduePayments: 0,
    overdueAmount: 0,
    paidPayments: 0,
    paidAmount: 0,
    occupancyRate: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    revenueByMonth: [],
    paymentsByStatus: [],
    propertiesByStatus: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  async function loadDashboardData() {
    const cacheKey = `dashboard_${period}`;
    
    // Tentar cache primeiro
    const cached = cacheService.get<{ metrics: DashboardMetrics; chartData: ChartData }>(cacheKey);
    if (cached) {
      setMetrics(cached.metrics);
      setChartData(cached.chartData);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Executar todas as queries em paralelo para ser mais rápido
      const [
        propertiesResult,
        tenantsResult,
        rentalsResult,
        paymentsResult,
      ] = await Promise.all([
        fetchPropertiesMetrics(),
        fetchTenantsMetrics(),
        fetchRentalsMetrics(),
        fetchPaymentsMetrics(period),
      ]);

      const newMetrics: DashboardMetrics = {
        ...propertiesResult,
        ...tenantsResult,
        ...rentalsResult,
        ...paymentsResult.metrics,
      };

      const newChartData: ChartData = {
        revenueByMonth: paymentsResult.revenueByMonth,
        paymentsByStatus: paymentsResult.paymentsByStatus,
        propertiesByStatus: propertiesResult.propertiesByStatus,
      };

      setMetrics(newMetrics);
      setChartData(newChartData);

      // Cachear resultado
      cacheService.set(cacheKey, { metrics: newMetrics, chartData: newChartData }, CACHE_TTL);

    } catch (error: any) {
      console.error("Erro ao carregar dados do dashboard:", error);
      
      toast({
        title: "Erro ao carregar dashboard",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPropertiesMetrics() {
    const { data: properties, error } = await supabase
      .from("properties")
      .select("status")
      .limit(1000);

    if (error) throw error;

    const totalProperties = properties?.length || 0;
    const availableProperties = properties?.filter((p) => p.status === "available").length || 0;
    const occupiedProperties = properties?.filter((p) => p.status === "rented").length || 0;

    // Agrupar por status em vez de tipo
    const statusCount = properties?.reduce((acc, p) => {
      const statusLabel = p.status === "available" ? "Disponível" : 
                         p.status === "rented" ? "Alugado" : 
                         p.status === "maintenance" ? "Manutenção" : p.status;
      acc[statusLabel] = (acc[statusLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const propertiesByStatus = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));

    const occupancyRate = totalProperties > 0
      ? Math.round((occupiedProperties / totalProperties) * 100)
      : 0;

    return {
      totalProperties,
      availableProperties,
      occupiedProperties,
      occupancyRate,
      propertiesByType: propertiesByStatus,
      propertiesByStatus,
    };
  }

  async function fetchTenantsMetrics() {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("status")
      .limit(1000);

    if (error) throw error;

    const totalTenants = tenants?.length || 0;
    const activeTenants = tenants?.filter((t) => t.status === "active").length || 0;
    const inactiveTenants = totalTenants - activeTenants;

    return {
      totalTenants,
      activeTenants,
      inactiveTenants,
    };
  }

  async function fetchRentalsMetrics() {
    const { data: rentals, error } = await supabase
      .from("rentals")
      .select("value")
      .eq("is_active", true)
      .limit(1000);

    if (error) throw error;

    const activeRentals = rentals?.length || 0;
    const monthlyRevenue = rentals?.reduce((sum, r) => sum + (r.value || 0), 0) || 0;

    return {
      activeRentals,
      monthlyRevenue,
    };
  }

  async function fetchPaymentsMetrics(period: Period) {
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
    }

    const { data: payments, error } = await supabase
      .from("payments")
      .select("status, expected_amount, paid_amount, due_date, payment_date")
      .gte("due_date", startDate.toISOString().split("T")[0])
      .limit(5000);

    if (error) throw error;

    // Métricas de pagamentos
    const overduePayments = payments?.filter((p) => p.status === "overdue").length || 0;
    const overdueAmount = payments
      ?.filter((p) => p.status === "overdue")
      .reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0;

    const paidPayments = payments?.filter((p) => p.status === "paid").length || 0;
    const paidAmount = payments
      ?.filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0;

    // Receita por mês (últimos 6 meses)
    const revenueByMonth = generateRevenueByMonth(payments || []);

    // Pagamentos por status
    const paymentsByStatus = [
      {
        status: "paid",
        count: paidPayments,
        amount: paidAmount,
      },
      {
        status: "pending",
        count: payments?.filter((p) => p.status === "pending").length || 0,
        amount: payments
          ?.filter((p) => p.status === "pending")
          .reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0,
      },
      {
        status: "overdue",
        count: overduePayments,
        amount: overdueAmount,
      },
      {
        status: "partial",
        count: payments?.filter((p) => p.status === "partial").length || 0,
        amount: payments
          ?.filter((p) => p.status === "partial")
          .reduce((sum, p) => sum + (p.expected_amount || 0) - (p.paid_amount || 0), 0) || 0,
      },
    ];

    return {
      metrics: {
        overduePayments,
        overdueAmount,
        paidPayments,
        paidAmount,
      },
      revenueByMonth,
      paymentsByStatus,
    };
  }

  function generateRevenueByMonth(payments: any[]) {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const today = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const value = payments
        .filter((p) => p.status === "paid" && p.payment_date?.startsWith(monthKey))
        .reduce((sum, p) => sum + (p.paid_amount || 0), 0);

      data.push({ month: `${month}/${year}`, value });
    }

    return data;
  }

  return {
    metrics,
    chartData,
    loading,
    refresh: loadDashboardData,
  };
}