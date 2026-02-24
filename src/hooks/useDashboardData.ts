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

// Cache em memória com TTL maior (views materializadas são atualizadas por triggers)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos (views são atualizadas automaticamente)

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
    const abortController = new AbortController();

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
            .eq("user_id", userId)
            .abortSignal(abortController.signal);
          
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

        // 2. USAR VIEWS MATERIALIZADAS - Queries ULTRA otimizadas
        const [
          exemptLocationsResult,
          dashboardStatsResult,
          monthlyPaymentsResult,
          monthlyExpensesResult,
        ] = await Promise.all([
          // Locais isentos (query simples)
          supabase
            .from("admin_fee_exempt_locations")
            .select("location_id")
            .abortSignal(abortController.signal),

          // Estatísticas gerais (VIEW MATERIALIZADA - pré-calculada!)
          (async () => {
            const query = supabase
              .from("mv_dashboard_stats")
              .select("*")
              .abortSignal(abortController.signal)
              .single();
            
            return query;
          })(),

          // Pagamentos do mês (VIEW MATERIALIZADA - pré-calculada!)
          (async () => {
            let query = supabase
              .from("mv_monthly_payments")
              .select("*")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString())
              .abortSignal(abortController.signal);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Despesas do mês (VIEW MATERIALIZADA - pré-calculada!)
          (async () => {
            let query = supabase
              .from("mv_monthly_expenses")
              .select("total_expenses")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString())
              .abortSignal(abortController.signal);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),
        ]);

        if (!isMounted) return;

        // 3. Processar resultados das VIEWS MATERIALIZADAS
        const exemptIds = exemptLocationsResult.data?.map(e => e.location_id) || [];
        setExemptLocationIds(exemptIds);

        // Stats gerais (dados pré-calculados!)
        const stats = dashboardStatsResult.data || {
          total_properties: 0,
          available_properties: 0,
          unavailable_properties: 0,
          occupied_properties: 0,
          total_tenants: 0,
          active_contracts: 0,
          expiring_contracts: 0,
        };

        // Pagamentos do mês (dados pré-calculados!)
        const paymentsData = monthlyPaymentsResult.data || [];
        
        let overduePayments = 0;
        let overdueAmount = 0;
        let dueTodayPayments = 0;
        let completedPayments = 0;
        let expectedAmount = 0;
        let grossRevenue = 0;

        paymentsData.forEach((payment: any) => {
          expectedAmount += payment.expected_amount || 0;
          
          if (payment.status === 'paid') {
            completedPayments++;
            grossRevenue += payment.paid_amount || 0;
          } else if (payment.due_date < todayStr) {
            overduePayments++;
            overdueAmount += payment.expected_amount || 0;
          } else if (payment.due_date === todayStr) {
            dueTodayPayments++;
          }
        });

        // Despesas do mês (dados pré-calculados!)
        const expensesData = monthlyExpensesResult.data || [];
        const locationExpenses = expensesData.reduce(
          (sum: number, e: any) => sum + (e.total_expenses || 0), 
          0
        );

        const newCounts: DashboardCounts = {
          totalProperties: stats.total_properties,
          availableProperties: stats.available_properties,
          unavailableProperties: stats.unavailable_properties,
          occupiedProperties: stats.occupied_properties,
          totalTenants: stats.total_tenants,
          activeContracts: stats.active_contracts,
          expiringContracts: stats.expiring_contracts,
          overduePayments,
          overdueAmount,
          dueTodayPayments,
          completedPayments,
          expectedAmount,
          grossRevenue,
          locationExpenses,
        };

        console.log("📊 Dashboard counts loaded (from materialized views):", newCounts);

        // Salvar no cache
        setCache(cacheKey, newCounts);
        setCounts(newCounts);

      } catch (error: any) {
        // Ignorar erros de abort (componente desmontado)
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          console.log("🚫 Dashboard request aborted (component unmounted)");
          return;
        }
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
      abortController.abort();
    };
  }, [month, year, userId, userRole, isFinancialUser, cacheKey]);

  return {
    loading,
    counts,
    exemptLocationIds,
  };
}