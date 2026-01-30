import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardData {
  totalProperties: number;
  availableProperties: number;
  rentedProperties: number;
  unavailableProperties: number;
  totalTenants: number;
  activeTenants: number;
  activeContracts: number;
  latePayments: number;
  receivedPayments: number;
  expectedValue: number;
  grossRevenue: number;
  netRevenue: number;
  occupancyRate: number;
  revenueData?: { month: string; value: number }[];
  occupancyData?: { month: string; rate: number }[];
  
  overduePayments: number;
  overdueAmount: number;
  dueTodayPayments: number;
  completedPayments: number;
  expectedAmount: number;
  receivedAmount: number;
  adminFee: number;
  paidPayments: number;
  pendingPayments: number;
}

const DEFAULT_DATA: DashboardData = {
  totalProperties: 0,
  availableProperties: 0,
  unavailableProperties: 0,
  rentedProperties: 0,
  totalTenants: 0,
  activeTenants: 0,
  activeContracts: 0,
  latePayments: 0,
  receivedPayments: 0,
  expectedValue: 0,
  grossRevenue: 0,
  netRevenue: 0,
  occupancyRate: 0,
  overduePayments: 0,
  overdueAmount: 0,
  dueTodayPayments: 0,
  completedPayments: 0,
  expectedAmount: 0,
  receivedAmount: 0,
  adminFee: 0,
  paidPayments: 0,
  pendingPayments: 0,
};

export function useDashboardData(month: number, year: number) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [month, year, user]);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase
        .from("system_users")
        .select("role")
        .eq("id", user?.id)
        .single();

      let allowedLocationIds: string[] | null = null;

      if (userData?.role === "financeiro") {
        const { data: permissions } = await supabase
          .from("user_location_permissions")
          .select("location_id")
          .eq("user_id", user?.id);

        allowedLocationIds = permissions?.map(p => p.location_id) || [];
        
        if (allowedLocationIds.length === 0) {
          setDashboardData(DEFAULT_DATA);
          setLoading(false);
          return;
        }
      }

      let propertiesQuery = supabase
        .from("properties")
        .select("id, status, location_id");

      if (allowedLocationIds) {
        propertiesQuery = propertiesQuery.in("location_id", allowedLocationIds);
      }

      const { data: properties, error: propError } = await propertiesQuery;

      if (propError) throw propError;

      const totalProperties = properties?.length || 0;
      const availableProperties = properties?.filter(p => p.status === "available").length || 0;
      const rentedProperties = properties?.filter(p => p.status === "rented").length || 0;
      const unavailableProperties = properties?.filter(p => p.status !== "available" && p.status !== "rented").length || 0;
      
      const occupancyRate = totalProperties > 0 
        ? (rentedProperties / totalProperties) * 100 
        : 0;

      const propertyIds = properties?.map(p => p.id) || [];
      
      let tenantsQuery = supabase
        .from("tenants")
        .select("id, status");

      if (allowedLocationIds && propertyIds.length > 0) {
        const { data: rentalsData } = await supabase
          .from("rentals")
          .select("tenant_id")
          .in("property_id", propertyIds);

        const tenantIds = rentalsData?.map(r => r.tenant_id) || [];
        if (tenantIds.length > 0) {
          tenantsQuery = tenantsQuery.in("id", tenantIds);
        } else {
          tenantsQuery = tenantsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: tenants, error: tenantError } = await tenantsQuery;

      if (tenantError) throw tenantError;

      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === "active").length || 0;

      let rentalsQuery = supabase
        .from("rentals")
        .select("id", { count: 'exact', head: true })
        .eq("is_active", true);

      if (allowedLocationIds && propertyIds.length > 0) {
        rentalsQuery = rentalsQuery.in("property_id", propertyIds);
      }

      const { count: activeContracts, error: rentalError } = await rentalsQuery;

      if (rentalError) throw rentalError;

      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      let paymentsQuery = supabase
        .from("payments")
        .select("status, expected_amount, paid_amount, due_date, admin_fee, rental_id")
        .gte("due_date", startDate)
        .lte("due_date", endDate);

      if (allowedLocationIds && propertyIds.length > 0) {
        const { data: rentalIds } = await supabase
          .from("rentals")
          .select("id")
          .in("property_id", propertyIds);

        const validRentalIds = rentalIds?.map(r => r.id) || [];
        if (validRentalIds.length > 0) {
          paymentsQuery = paymentsQuery.in("rental_id", validRentalIds);
        } else {
          paymentsQuery = paymentsQuery.eq("rental_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

      if (paymentsError) throw paymentsError;

      // Buscar contas a pagar (location_expenses) do mês
      let expensesQuery = supabase
        .from("location_expenses")
        .select("amount, status, location_id")
        .eq("reference_month", month)
        .eq("reference_year", year);

      if (allowedLocationIds) {
        expensesQuery = expensesQuery.in("location_id", allowedLocationIds);
      }

      const { data: expensesData } = await expensesQuery;

      let paidPayments = 0;
      let overduePayments = 0;
      let overdueAmount = 0;
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
            overdueAmount += Number(payment.expected_amount) || 0;
          } else if (dueDate === today) {
            dueTodayPayments++;
          }
        }
      });

      // Calcular total de contas a pagar do mês
      let monthExpensesTotal = 0;
      expensesData?.forEach((expense) => {
        monthExpensesTotal += Number(expense.amount) || 0;
      });

      // Receita Líquida = Receita Bruta (recebida) - Taxa Admin - Contas a Pagar
      const netRevenue = receivedAmount - adminFeeTotal - monthExpensesTotal;

      setDashboardData({
        totalProperties,
        availableProperties,
        unavailableProperties,
        rentedProperties,
        totalTenants,
        activeTenants,
        activeContracts: activeContracts || 0,
        
        latePayments: overduePayments,
        receivedPayments: paidPayments,
        expectedValue: expectedAmount + monthExpensesTotal,

        overduePayments,
        overdueAmount,
        completedPayments: paidPayments,
        dueTodayPayments,
        expectedAmount: expectedAmount + monthExpensesTotal,
        receivedAmount,
        grossRevenue: receivedAmount,
        netRevenue,
        adminFee: adminFeeTotal,
        paidPayments,
        pendingPayments: 0,
        occupancyRate,
        revenueData: [], 
        occupancyData: [] 
      });

    } catch (err: any) {
      console.error("Erro ao carregar dados do dashboard:", err);
      setError(err.message || "Erro desconhecido ao carregar dados.");
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