import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardData {
  totalProperties: number;
  availableProperties: number;
  rentedProperties: number;
  unavailableProperties: number;
  occupancyRate: number;
  totalTenants: number;
  activeTenants: number;
  activeContracts: number;
  overduePayments: number;
  overdueAmount: number;
  dueTodayPayments: number;
  completedPayments: number;
  expectedAmount: number;
  grossRevenue: number;
  totalFeesAndExpenses: number;
  netRevenue: number;
}

const DEFAULT_DATA: DashboardData = {
  totalProperties: 0,
  availableProperties: 0,
  unavailableProperties: 0,
  rentedProperties: 0,
  occupancyRate: 0,
  totalTenants: 0,
  activeTenants: 0,
  activeContracts: 0,
  overduePayments: 0,
  overdueAmount: 0,
  dueTodayPayments: 0,
  completedPayments: 0,
  expectedAmount: 0,
  grossRevenue: 0,
  totalFeesAndExpenses: 0,
  netRevenue: 0,
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
      const rentedProperties = properties?.filter(p => p.status === "occupied").length || 0;
      const unavailableProperties = properties?.filter(p => p.status === "unavailable").length || 0;
      
      // Taxa de ocupação: imóveis ocupados / (imóveis disponíveis + ocupados)
      const totalAvailableForRent = availableProperties + rentedProperties;
      const occupancyRate = totalAvailableForRent > 0 
        ? (rentedProperties / totalAvailableForRent) * 100 
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

      const { data: expensesData, error: expensesError } = await supabase
        .from("location_expenses")
        .select("amount")
        .eq("reference_month", month)
        .eq("reference_year", year);

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
      }

      const locationExpensesTotal = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      const { data: rentals } = await supabase
        .from("rentals")
        .select("id, property_id");

      const { data: configData } = await supabase
        .from("configs")
        .select("admin_fee_percentage, management_fee_percentage")
        .maybeSingle();

      let paidPayments = 0;
      let overduePayments = 0;
      let overdueAmount = 0;
      let dueTodayPayments = 0;
      let expectedAmount = 0;
      let receivedAmount = 0;
      let adminFeeTotal = 0;
      let managementFeeTotal = 0;

      const today = new Date().toISOString().split("T")[0];

      const { data: exemptions } = await supabase
        .from("user_fee_exemptions")
        .select("location_id")
        .eq("user_id", user?.id);
      
      const exemptLocationIds = exemptions?.map(e => e.location_id) || [];

      paymentsData?.forEach((payment) => {
        expectedAmount += Number(payment.expected_amount) || 0;

        if (payment.status === "paid") {
          paidPayments++;
          const paidAmount = Number(payment.paid_amount) || 0;
          receivedAmount += paidAmount;
          
          const rental = rentals?.find(r => r.id === payment.rental_id);
          const property = properties?.find(p => p.id === rental?.property_id);
          
          if (property && !exemptLocationIds.includes(property.location_id)) {
            const adminFeeRate = configData ? (configData.admin_fee_percentage || 0) / 100 : 0.05;
            const managementFeeRate = configData ? (configData.management_fee_percentage || 0) / 100 : 0;
            
            adminFeeTotal += paidAmount * adminFeeRate;
            managementFeeTotal += paidAmount * managementFeeRate;
          }
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

      const grossRevenue = receivedAmount;
      const totalFeesAndExpenses = adminFeeTotal + managementFeeTotal + locationExpensesTotal;
      const netRevenue = grossRevenue - totalFeesAndExpenses;

      setDashboardData({
        totalProperties,
        availableProperties,
        unavailableProperties,
        rentedProperties,
        occupancyRate,
        totalTenants,
        activeTenants,
        activeContracts: activeContracts || 0,
        overduePayments,
        overdueAmount,
        completedPayments: paidPayments,
        dueTodayPayments,
        expectedAmount,
        grossRevenue,
        totalFeesAndExpenses,
        netRevenue,
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