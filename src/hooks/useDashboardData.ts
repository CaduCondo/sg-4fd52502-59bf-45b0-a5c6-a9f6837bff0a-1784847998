import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DashboardData {
  totalProperties: number;
  availableProperties: number;
  unavailableProperties: number;
  rentedProperties: number;
  totalTenants: number;
  activeContracts: number;
  overduePayments: number;
  completedPayments: number;
  expectedAmount: number;
  receivedAmount: number;
  grossRevenue: number;
  netRevenue: number;
  adminFee: number;
  paidPayments: number;
  pendingPayments: number;
  dueTodayPayments: number;
  occupancyRate: number;
}

const DEFAULT_DATA: DashboardData = {
  totalProperties: 0,
  availableProperties: 0,
  unavailableProperties: 0,
  rentedProperties: 0,
  totalTenants: 0,
  activeContracts: 0,
  overduePayments: 0,
  completedPayments: 0,
  expectedAmount: 0,
  receivedAmount: 0,
  grossRevenue: 0,
  netRevenue: 0,
  adminFee: 0,
  paidPayments: 0,
  pendingPayments: 0,
  dueTodayPayments: 0,
  occupancyRate: 0,
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
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();
      const today = new Date().toISOString().split('T')[0];

      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("status, expected_amount, paid_amount, due_date, admin_fee_value")
        .gte("due_date", startDate)
        .lte("due_date", endDate);

      if (paymentError) throw paymentError;

      // Calcular métricas financeiras
      let expectedAmount = 0;
      let receivedAmount = 0;
      let overduePayments = 0;
      let completedPayments = 0;
      let pendingPayments = 0;
      let dueTodayPayments = 0;
      let adminFeeTotal = 0;

      payments?.forEach(payment => {
        expectedAmount += payment.expected_amount || 0;
        
        if (payment.status === "paid") {
          receivedAmount += payment.paid_amount || 0;
          completedPayments++;
          // Se tiver taxa de administração registrada no pagamento
          if (payment.admin_fee_value) {
            adminFeeTotal += payment.admin_fee_value;
          } else {
            // Estimativa de 10% se não tiver valor salvo (ajuste conforme regra de negócio)
            adminFeeTotal += (payment.paid_amount || 0) * 0.1;
          }
        } else if (payment.status === "overdue") {
          overduePayments++;
        } else if (payment.status === "pending") {
          pendingPayments++;
          if (payment.due_date === today) {
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
        overduePayments,
        completedPayments,
        expectedAmount,
        receivedAmount,
        grossRevenue: receivedAmount,
        netRevenue,
        adminFee: adminFeeTotal,
        paidPayments: completedPayments,
        pendingPayments,
        dueTodayPayments,
        occupancyRate
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