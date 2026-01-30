import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  totalProperties: number;
  availableProperties: number;
  rentedProperties: number;
  unavailableProperties: number;
  totalTenants: number;
  activeContracts: number;
  latePayments: number;
  receivedPayments: number;
  expectedValue: number;
  grossRevenue: number;
  netRevenue: number;
  occupancyRate: number;
  revenueData?: { month: string; value: number }[];
  occupancyData?: { month: string; rate: number }[];
  
  // Missing fields required by dashboard.tsx
  overduePayments: number;
  completedPayments: number;
  expectedAmount: number;
  receivedAmount: number;
  adminFee: number;
  paidPayments: number;
  pendingPayments: number;
  dueTodayPayments: number;
}

const DEFAULT_DATA: DashboardData = {
  totalProperties: 0,
  availableProperties: 0,
  unavailableProperties: 0,
  rentedProperties: 0,
  totalTenants: 0,
  activeContracts: 0,
  latePayments: 0,
  receivedPayments: 0,
  expectedValue: 0,
  grossRevenue: 0,
  netRevenue: 0,
  occupancyRate: 0,
  overduePayments: 0,
  completedPayments: 0,
  expectedAmount: 0,
  receivedAmount: 0,
  adminFee: 0,
  paidPayments: 0,
  pendingPayments: 0,
  dueTodayPayments: 0,
};

export function useDashboardData(month: number, year: number) {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [month, year]);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar métricas de imóveis
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("status");

      if (propError) throw propError;

      const totalProperties = properties?.length || 0;
      const availableProperties = properties?.filter(p => p.status === "available").length || 0;
      const rentedProperties = properties?.filter(p => p.status === "rented").length || 0;
      const unavailableProperties = properties?.filter(p => p.status !== "available" && p.status !== "rented").length || 0;
      
      const occupancyRate = totalProperties > 0 
        ? (rentedProperties / totalProperties) * 100 
        : 0;

      // 2. Buscar métricas de inquilinos
      const { count: totalTenants, error: tenantError } = await supabase
        .from("tenants")
        .select("*", { count: 'exact', head: true });

      if (tenantError) throw tenantError;

      // 3. Buscar contratos ativos
      const { count: activeContracts, error: rentalError } = await supabase
        .from("rentals")
        .select("*", { count: 'exact', head: true })
        .eq("is_active", true);

      if (rentalError) throw rentalError;

      // 4. Buscar pagamentos do mês/ano selecionado
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("status, expected_amount, paid_amount, due_date, admin_fee")
        .gte("due_date", startDate)
        .lte("due_date", endDate);

      if (paymentsError) throw paymentsError;

      // Calcular métricas de pagamentos
      let paidPayments = 0;
      let overduePayments = 0;
      let dueTodayPayments = 0;
      let expectedAmount = 0;
      let receivedAmount = 0;
      let adminFeeTotal = 0;

      const today = new Date().toISOString().split("T")[0];

      paymentsData?.forEach((payment) => {
        expectedAmount += Number(payment.expected_amount) || 0;

        if (payment.status === "paid") {
          paidPayments++;
          receivedAmount += Number(payment.paid_amount) || 0;
          adminFeeTotal += Number(payment.admin_fee) || 0;
        } else {
          const dueDate = payment.due_date?.split("T")[0];
          if (dueDate && dueDate < today) {
            overduePayments++;
          } else if (dueDate === today) {
            dueTodayPayments++;
          }
        }
      });

      const netRevenue = receivedAmount - adminFeeTotal;

      setDashboardData({
        totalProperties,
        availableProperties,
        unavailableProperties,
        rentedProperties,
        totalTenants: totalTenants || 0,
        activeContracts: activeContracts || 0,
        
        // Legacy fields mapping
        latePayments: overduePayments,
        receivedPayments: paidPayments,
        expectedValue: expectedAmount,

        // Current fields
        overduePayments,
        completedPayments: paidPayments,
        expectedAmount,
        receivedAmount,
        grossRevenue: receivedAmount,
        netRevenue,
        adminFee: adminFeeTotal,
        paidPayments,
        pendingPayments: 0,
        dueTodayPayments,
        occupancyRate,
        revenueData: [], 
        occupancyData: [] 
      });

    } catch (err: any) {
      console.error("Erro ao carregar dados do dashboard:", err);
      setError(err.message || "Erro desconhecido ao carregar dados.");
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    dashboardData,
    loading,
    error,
    refresh: loadDashboardData,
  };
}