import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardCounts {
  totalProperties: number;
  availableProperties: number;
  unavailableProperties: number;
  occupiedProperties: number;
  totalTenants: number;
  activeContracts: number;
  expiringContracts: number;
  overduePayments: number;
  overdueAmount: number;
  dueTodayPayments: number;
  completedPayments: number;
  expectedAmount: number;
  grossRevenue: number;
  locationExpenses: number;
}

interface DashboardData {
  loading: boolean;
  counts: DashboardCounts;
  exemptLocationIds: string[];
}

// Cache mais longo (5 minutos)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function useDashboardData(
  month: number,
  year: number,
  userId: string | undefined,
  userRole: string | undefined
): DashboardData {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<DashboardCounts>({
    totalProperties: 0,
    availableProperties: 0,
    unavailableProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    activeContracts: 0,
    expiringContracts: 0,
    overduePayments: 0,
    overdueAmount: 0,
    dueTodayPayments: 0,
    completedPayments: 0,
    expectedAmount: 0,
    grossRevenue: 0,
    locationExpenses: 0,
  });
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

  const isFinancialUser = useMemo(() => userRole === "financial", [userRole]);
  const cacheKey = useMemo(
    () => `dashboard_${userId}_${month}_${year}_${userRole}`,
    [userId, month, year, userRole]
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      // Tentar cache primeiro
      const cached = getCached<DashboardCounts>(cacheKey);
      if (cached) {
        console.log("📦 Using cached dashboard data");
        setCounts(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Buscar permissões e isenções em paralelo
        const [permissionsResult, exemptLocationsResult] = await Promise.all([
          isFinancialUser
            ? supabase
                .from("user_location_permissions")
                .select("location_id")
                .eq("user_id", userId)
            : Promise.resolve({ data: null }),
          supabase.from("admin_fee_exempt_locations").select("location_id"),
        ]);

        const allowedLocations = permissionsResult.data?.map((p) => p.location_id) || null;

        // Se usuário financeiro sem permissões, retorna vazio
        if (isFinancialUser && allowedLocations && allowedLocations.length === 0) {
          setCounts({
            totalProperties: 0,
            availableProperties: 0,
            unavailableProperties: 0,
            occupiedProperties: 0,
            totalTenants: 0,
            activeContracts: 0,
            expiringContracts: 0,
            overduePayments: 0,
            overdueAmount: 0,
            dueTodayPayments: 0,
            completedPayments: 0,
            expectedAmount: 0,
            grossRevenue: 0,
            locationExpenses: 0,
          });
          setExemptLocationIds([]);
          setLoading(false);
          return;
        }

        const exemptIds = exemptLocationsResult.data?.map((e) => e.location_id) || [];
        setExemptLocationIds(exemptIds);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        const twoMonthsStr = twoMonthsFromNow.toISOString().split("T")[0];

        // 2. Queries Otimizadas e Paralelas
        
        // Query de propriedades (status)
        const fetchProperties = async () => {
          let query = supabase.from("properties").select("status");
          if (isFinancialUser && allowedLocations) {
            query = query.in("location_id", allowedLocations);
          }
          const { data } = await query;
          return data || [];
        };

        // Query de inquilinos (count)
        const fetchTenants = async () => {
          const { count } = await supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .neq("status", "inactive");
          return count || 0;
        };

        // Query de contratos ativos (count)
        const fetchActiveContracts = async () => {
          let query = supabase
            .from("rentals")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true);
            
          if (isFinancialUser && allowedLocations) {
            query = query.in("property_id", allowedLocations);
          }
          
          const { count } = await query;
          return count || 0;
        };

        // Query de contratos expirando (count)
        const fetchExpiringContracts = async () => {
          let query = supabase
            .from("rentals")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .gte("end_date", todayStr)
            .lte("end_date", twoMonthsStr);
            
          if (isFinancialUser && allowedLocations) {
            query = query.in("property_id", allowedLocations);
          }
          
          const { count } = await query;
          return count || 0;
        };

        // Query de pagamentos atrasados (amount + count)
        const fetchOverduePayments = async () => {
          // Precisamos fazer o join para filtrar por localização se necessário
          let query = supabase
            .from("payments")
            .select(`
              expected_amount,
              rental:rentals!inner(property_id)
            `)
            .neq("status", "paid")
            .lt("due_date", todayStr)
            .eq("reference_month", month.toString())
            .eq("reference_year", year.toString());

          if (isFinancialUser && allowedLocations) {
             query = query.in("rental.property_id", allowedLocations);
          }

          const { data } = await query;
          
          const payments = data || [];
          const count = payments.length;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sum = payments.reduce((acc: number, p: any) => acc + (p.expected_amount || 0), 0);
          
          return { count, sum };
        };

        // Query de pagamentos hoje (count)
        const fetchDueToday = async () => {
          let query = supabase
            .from("payments")
            .select(`
              id,
              rental:rentals!inner(property_id)
            `, { count: "exact", head: true })
            .neq("status", "paid")
            .eq("due_date", todayStr)
            .eq("reference_month", month.toString())
            .eq("reference_year", year.toString());

          if (isFinancialUser && allowedLocations) {
             query = query.in("rental.property_id", allowedLocations);
          }

          const { count } = await query;
          return count || 0;
        };

        // Query de pagamentos pagos (count)
        const fetchCompleted = async () => {
          let query = supabase
            .from("payments")
            .select(`
              id,
              rental:rentals!inner(property_id)
            `, { count: "exact", head: true })
            .eq("status", "paid")
            .eq("reference_month", month.toString())
            .eq("reference_year", year.toString());

          if (isFinancialUser && allowedLocations) {
             query = query.in("rental.property_id", allowedLocations);
          }

          const { count } = await query;
          return count || 0;
        };

        // Query de receita esperada (sum)
        const fetchExpectedAmount = async () => {
          let query = supabase
            .from("payments")
            .select(`
              expected_amount,
              rental:rentals!inner(property_id)
            `)
            .eq("reference_month", month.toString())
            .eq("reference_year", year.toString());

          if (isFinancialUser && allowedLocations) {
             query = query.in("rental.property_id", allowedLocations);
          }

          const { data } = await query;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data || []).reduce((acc: number, p: any) => acc + (p.expected_amount || 0), 0);
        };

        // Query de receita bruta (sum)
        const fetchGrossRevenue = async () => {
          let query = supabase
            .from("payments")
            .select(`
              paid_amount,
              rental:rentals!inner(property_id)
            `)
            .eq("status", "paid")
            .eq("reference_month", month.toString())
            .eq("reference_year", year.toString());

          if (isFinancialUser && allowedLocations) {
             query = query.in("rental.property_id", allowedLocations);
          }

          const { data } = await query;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data || []).reduce((acc: number, p: any) => acc + (p.paid_amount || 0), 0);
        };

        // Query de despesas (sum)
        const fetchExpenses = async () => {
          let query = supabase
            .from("location_expenses")
            .select("amount")
            .eq("reference_month", month)
            .eq("reference_year", year);

          if (isFinancialUser && allowedLocations) {
            query = query.in("location_id", allowedLocations);
          }

          const { data } = await query;
          return (data || []).reduce((acc, e) => acc + (e.amount || 0), 0);
        };

        // Executar todas em paralelo
        const [
          properties,
          totalTenants,
          activeContracts,
          expiringContracts,
          overdueData,
          dueToday,
          completed,
          expectedAmount,
          grossRevenue,
          locationExpenses
        ] = await Promise.all([
          fetchProperties(),
          fetchTenants(),
          fetchActiveContracts(),
          fetchExpiringContracts(),
          fetchOverduePayments(),
          fetchDueToday(),
          fetchCompleted(),
          fetchExpectedAmount(),
          fetchGrossRevenue(),
          fetchExpenses()
        ]);

        if (!isMounted) return;

        const totalProperties = properties.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const availableProperties = properties.filter((p: any) => p.status === "available").length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unavailableProperties = properties.filter((p: any) => p.status === "unavailable").length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const occupiedProperties = properties.filter((p: any) => p.status === "occupied").length;

        const newCounts: DashboardCounts = {
          totalProperties,
          availableProperties,
          unavailableProperties,
          occupiedProperties,
          totalTenants,
          activeContracts,
          expiringContracts,
          overduePayments: overdueData.count,
          overdueAmount: overdueData.sum,
          dueTodayPayments: dueToday,
          completedPayments: completed,
          expectedAmount,
          grossRevenue,
          locationExpenses,
        };

        console.log("📊 Dashboard counts loaded:", newCounts);

        // Salvar no cache
        setCache(cacheKey, newCounts);
        setCounts(newCounts);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [month, year, userId, userRole, isFinancialUser, cacheKey]);

  return {
    loading,
    counts,
    exemptLocationIds,
  };
}