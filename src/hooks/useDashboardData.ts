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

// Cache simples em memória
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 segundos

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

        // 1. Buscar permissões de localização (se financeiro)
        let allowedLocations: string[] | null = null;
        if (isFinancialUser) {
          const { data: permData } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);
          
          allowedLocations = permData?.map(p => p.location_id) || [];
          
          if (allowedLocations.length === 0) {
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
            setLoading(false);
            return;
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        const twoMonthsStr = twoMonthsFromNow.toISOString().split('T')[0];

        // 2. Executar queries OTIMIZADAS em paralelo (apenas contagens)
        const [
          exemptLocationsResult,
          totalPropertiesResult,
          availablePropertiesResult,
          unavailablePropertiesResult,
          occupiedPropertiesResult,
          tenantsCountResult,
          activeContractsResult,
          expiringContractsResult,
          overduePaymentsResult,
          dueTodayPaymentsResult,
          completedPaymentsResult,
          expectedAmountResult,
          grossRevenueResult,
          expensesResult
        ] = await Promise.all([
          // Locais isentos
          supabase
            .from("admin_fee_exempt_locations")
            .select("location_id"),

          // COUNT: Total de propriedades
          (async () => {
            let query = supabase
              .from("properties")
              .select("id", { count: "exact", head: true });
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Propriedades disponíveis
          (async () => {
            let query = supabase
              .from("properties")
              .select("id", { count: "exact", head: true })
              .eq("status", "available");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Propriedades indisponíveis
          (async () => {
            let query = supabase
              .from("properties")
              .select("id", { count: "exact", head: true })
              .eq("status", "unavailable");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Propriedades ocupadas
          (async () => {
            let query = supabase
              .from("properties")
              .select("id", { count: "exact", head: true })
              .eq("status", "occupied");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Inquilinos ativos
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .neq("status", "inactive"),

          // COUNT: Contratos ativos
          (async () => {
            let query = supabase
              .from("rentals")
              .select("id, properties!inner(location_id)", { count: "exact", head: true })
              .eq("is_active", true);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Contratos a vencer
          (async () => {
            let query = supabase
              .from("rentals")
              .select("id, properties!inner(location_id)", { count: "exact", head: true })
              .eq("is_active", true)
              .gte("end_date", todayStr)
              .lte("end_date", twoMonthsStr);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Pagamentos atrasados (precisa do valor)
          (async () => {
            let query = supabase
              .from("payments")
              .select("expected_amount, rental:rentals!inner(properties!inner(location_id))")
              .neq("status", "paid")
              .lt("due_date", todayStr)
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rental.properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Pagamentos que vencem hoje
          (async () => {
            let query = supabase
              .from("payments")
              .select("id, rental:rentals!inner(properties!inner(location_id))", { count: "exact", head: true })
              .neq("status", "paid")
              .eq("due_date", todayStr)
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rental.properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // COUNT: Pagamentos concluídos
          (async () => {
            let query = supabase
              .from("payments")
              .select("id, rental:rentals!inner(properties!inner(location_id))", { count: "exact", head: true })
              .eq("status", "paid")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rental.properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Valor esperado total
          (async () => {
            let query = supabase
              .from("payments")
              .select("expected_amount, rental:rentals!inner(properties!inner(location_id))")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rental.properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Receita bruta (pagamentos realizados)
          (async () => {
            let query = supabase
              .from("payments")
              .select("paid_amount, rental:rentals!inner(properties!inner(location_id))")
              .eq("status", "paid")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rental.properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Despesas de locação
          (async () => {
            let query = supabase
              .from("location_expenses")
              .select("amount")
              .eq("reference_month", month)
              .eq("reference_year", year);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })()
        ]);

        if (!isMounted) return;

        // Processar resultados
        const exemptIds = exemptLocationsResult.data?.map(e => e.location_id) || [];
        setExemptLocationIds(exemptIds);

        const overdueData = overduePaymentsResult.data || [];
        const overdueAmount = overdueData.reduce((sum, p) => sum + (p.expected_amount || 0), 0);

        const expectedData = expectedAmountResult.data || [];
        const expectedAmount = expectedData.reduce((sum, p) => sum + (p.expected_amount || 0), 0);

        const grossData = grossRevenueResult.data || [];
        const grossRevenue = grossData.reduce((sum, p) => sum + (p.paid_amount || 0), 0);

        const expensesData = expensesResult.data || [];
        const locationExpenses = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);

        const newCounts: DashboardCounts = {
          totalProperties: totalPropertiesResult.count || 0,
          availableProperties: availablePropertiesResult.count || 0,
          unavailableProperties: unavailablePropertiesResult.count || 0,
          occupiedProperties: occupiedPropertiesResult.count || 0,
          totalTenants: tenantsCountResult.count || 0,
          activeContracts: activeContractsResult.count || 0,
          expiringContracts: expiringContractsResult.count || 0,
          overduePayments: overdueData.length,
          overdueAmount,
          dueTodayPayments: dueTodayPaymentsResult.count || 0,
          completedPayments: completedPaymentsResult.count || 0,
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
    exemptLocationIds
  };
}