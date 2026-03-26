import { useState, useEffect, useMemo, useRef } from "react";
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
  pendingPayments: number;
}

interface DashboardData {
  loading: boolean;
  counts: DashboardCounts;
  exemptLocationIds: string[];
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✅ [useDashboardData] Cache hit para ${key}`);
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`💾 [useDashboardData] Cache atualizado para ${key}`);
}

export function invalidateDashboardCache(): void {
  cache.clear();
  console.log("🗑️ [useDashboardData] Cache limpo");
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
    pendingPayments: 0,
  });
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

  const isFinancialUser = useMemo(() => userRole === "financial", [userRole]);
  const cacheKey = useMemo(
    () => `dashboard_${userId}_${month}_${year}_${userRole}`,
    [userId, month, year, userRole]
  );

  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      if (loadingRef.current && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const cached = getCached<DashboardCounts>(cacheKey);
      if (cached) {
        setCounts(cached);
        setLoading(false);
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        abortControllerRef.current = new AbortController();

        let allowedLocations: string[] | null = null;
        if (isFinancialUser) {
          const { data: permData } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);
          
          if (abortControllerRef.current?.signal.aborted) {
            loadingRef.current = false;
            return;
          }
          
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
              pendingPayments: 0,
            });
            setLoading(false);
            loadingRef.current = false;
            return;
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        console.log("📅 [useDashboardData] Período:", {
          month,
          year,
          today: todayStr
        });

        const [
          exemptLocationsResult,
          propertiesResult,
          tenantsResult,
          rentalsResult,
          monthlyPaymentsResult,
          monthlyExpensesResult,
        ] = await Promise.all([
          supabase
            .from("admin_fee_exempt_locations")
            .select("location_id"),

          (async () => {
            let query = supabase
              .from("properties")
              .select("id, status, location_id");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          (async () => {
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              const { data: allowedRentals } = await supabase
                .from("rentals")
                .select("tenant_id, properties!inner(location_id)")
                .in("properties.location_id", allowedLocations)
                .eq("status", "active");
              
              const tenantIds = [...new Set(allowedRentals?.map(r => r.tenant_id) || [])];
              
              return supabase
                .from("tenants")
                .select("id")
                .in("id", tenantIds);
            } else {
              return supabase
                .from("tenants")
                .select("id");
            }
          })(),

          (async () => {
            let query = supabase
              .from("rentals")
              .select("id, status, end_date, properties!inner(location_id)");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          (async () => {
            let query = supabase
              .from("mv_monthly_payments")
              .select("*")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          (async () => {
            let query = supabase
              .from("mv_monthly_expenses")
              .select("total_expenses")
              .eq("reference_month", month)
              .eq("reference_year", year);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),
        ]);

        if (abortControllerRef.current?.signal.aborted) {
          loadingRef.current = false;
          return;
        }

        const exemptIds = exemptLocationsResult.data?.map(e => e.location_id) || [];
        setExemptLocationIds(exemptIds);

        const properties = propertiesResult.data || [];
        const totalProperties = properties.length;
        const availableProperties = properties.filter(p => p.status === "available").length;
        const unavailableProperties = properties.filter(p => p.status === "unavailable").length;
        const occupiedProperties = properties.filter(p => p.status === "occupied").length;

        const totalTenants = tenantsResult.data?.length || 0;

        const rentals = rentalsResult.data || [];
        const activeContracts = rentals.filter(r => r.status === "active").length;
        
        const expiringDate = new Date(today);
        expiringDate.setDate(expiringDate.getDate() + 30);
        const expiringDateStr = expiringDate.toISOString().split('T')[0];
        const expiringContracts = rentals.filter(r => 
          r.status === "active" && 
          r.end_date <= expiringDateStr
        ).length;

        const paymentsData = monthlyPaymentsResult.data || [];
        
        let overduePayments = 0;
        let overdueAmount = 0;
        let dueTodayPayments = 0;
        let completedPayments = 0;
        let pendingPayments = 0;
        let expectedAmount = 0;
        let grossRevenue = 0;

        console.log("📊 [useDashboardData] Analisando pagamentos:", {
          total: paymentsData.length,
          today: todayStr
        });

        paymentsData.forEach((payment: any) => {
          const dueDate = payment.due_date;
          const status = payment.status;
          
          expectedAmount += payment.expected_amount || 0;
          
          if (status === 'paid') {
            completedPayments++;
            grossRevenue += payment.paid_amount || 0;
          } 
          else if ((status === 'pending' || status === 'partial') && dueDate < todayStr) {
            overduePayments++;
            overdueAmount += payment.expected_amount || 0;
          } 
          else if ((status === 'pending' || status === 'partial') && dueDate === todayStr) {
            dueTodayPayments++;
          }
          
          if (status === 'pending' || status === 'partial') {
            pendingPayments++;
          }
        });

        console.log("📊 [useDashboardData] Resultado da contagem:", {
          completedPayments,
          overduePayments,
          dueTodayPayments,
          pendingPayments,
          grossRevenue,
          overdueAmount
        });

        const expensesData = monthlyExpensesResult.data || [];
        const locationExpenses = expensesData.reduce(
          (sum: number, e: any) => sum + (e.total_expenses || 0), 
          0
        );

        const newCounts: DashboardCounts = {
          totalProperties,
          availableProperties,
          unavailableProperties,
          occupiedProperties,
          totalTenants,
          activeContracts,
          expiringContracts,
          overduePayments,
          overdueAmount,
          dueTodayPayments,
          completedPayments,
          expectedAmount,
          grossRevenue,
          locationExpenses,
          pendingPayments,
        };

        setCache(cacheKey, newCounts);
        setCounts(newCounts);

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("ℹ️ [useDashboardData] Requisição cancelada");
          return;
        }
        
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
  }, [month, year, userId, userRole, isFinancialUser, cacheKey]);

  return {
    loading,
    counts,
    exemptLocationIds,
  };
}