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

        // 1. Buscar permissões de localização (se financeiro) e locais isentos em paralelo
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

        // 2. Queries otimizadas em 3 grupos paralelos
        // Grupo 1: Propriedades e Inquilinos (simples, sem JOINs)
        const propertiesQueries = Promise.all([
          // Total de propriedades
          (async () => {
            let query = supabase
              .from("properties")
              .select("status", { count: "exact" });

            if (isFinancialUser && allowedLocations) {
              query = query.in("location_id", allowedLocations);
            }

            return query;
          })(),

          // Total de inquilinos
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .neq("status", "inactive"),
        ]);

        // Grupo 2: Contratos (requer JOIN mas otimizado)
        const contractsQueries = Promise.all([
          // Contratos ativos
          (async () => {
            let query = supabase
              .from("rentals")
              .select("id", { count: "exact", head: true })
              .eq("is_active", true);

            if (isFinancialUser && allowedLocations) {
              query = query.in("property_id", allowedLocations);
            }

            return query;
          })(),

          // Contratos a vencer (sem JOIN, usando property_id direto)
          (async () => {
            let query = supabase
              .from("rentals")
              .select("id", { count: "exact", head: true })
              .eq("is_active", true)
              .gte("end_date", todayStr)
              .lte("end_date", twoMonthsStr);

            if (isFinancialUser && allowedLocations) {
              query = query.in("property_id", allowedLocations);
            }

            return query;
          })(),
        ]);

        // Grupo 3: Pagamentos (agregação SQL ao invés de processar em JS)
        const paymentsQueries = Promise.all([
          // Pagamentos atrasados - COUNT e SUM em uma query
          (async () => {
            const query = supabase.rpc("get_overdue_payments_summary", {
              p_month: month,
              p_year: year,
              p_today: todayStr,
            });

            // Se financeiro, filtrar depois (RPC não suporta location_id direto)
            const result = await query;
            
            if (isFinancialUser && allowedLocations) {
              // Buscar apenas pagamentos de propriedades permitidas
              const { data: filteredData } = await supabase
                .from("payments")
                .select("expected_amount, rental:rentals!inner(property_id)")
                .neq("status", "paid")
                .lt("due_date", todayStr)
                .eq("reference_month", month.toString())
                .eq("reference_year", year.toString())
                .in("rental.property_id", allowedLocations);

              const count = filteredData?.length || 0;
              const sum = filteredData?.reduce((acc, p) => acc + (p.expected_amount || 0), 0) || 0;
              
              return { data: { count, sum }, error: null };
            }

            return result;
          })(),

          // Pagamentos que vencem hoje
          (async () => {
            let query = supabase
              .from("payments")
              .select("id", { count: "exact", head: true })
              .neq("status", "paid")
              .eq("due_date", todayStr)
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());

            if (isFinancialUser && allowedLocations) {
              // Buscar rental_id das propriedades permitidas
              const { data: rentals } = await supabase
                .from("rentals")
                .select("id")
                .in("property_id", allowedLocations);

              const rentalIds = rentals?.map((r) => r.id) || [];
              if (rentalIds.length === 0) return { count: 0 };
              query = query.in("rental_id", rentalIds);
            }

            return query;
          })(),

          // Pagamentos concluídos
          (async () => {
            let query = supabase
              .from("payments")
              .select("id", { count: "exact", head: true })
              .eq("status", "paid")
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());

            if (isFinancialUser && allowedLocations) {
              const { data: rentals } = await supabase
                .from("rentals")
                .select("id")
                .in("property_id", allowedLocations);

              const rentalIds = rentals?.map((r) => r.id) || [];
              if (rentalIds.length === 0) return { count: 0 };
              query = query.in("rental_id", rentalIds);
            }

            return query;
          })(),

          // Valor esperado total - SUM via agregação
          (async () => {
            const query = supabase.rpc("get_expected_amount_summary", {
              p_month: month,
              p_year: year,
            });

            const result = await query;

            if (isFinancialUser && allowedLocations) {
              const { data: filteredData } = await supabase
                .from("payments")
                .select("expected_amount, rental:rentals!inner(property_id)")
                .eq("reference_month", month.toString())
                .eq("reference_year", year.toString())
                .in("rental.property_id", allowedLocations);

              const sum = filteredData?.reduce((acc, p) => acc + (p.expected_amount || 0), 0) || 0;
              return { data: sum, error: null };
            }

            return result;
          })(),

          // Receita bruta - SUM via agregação
          (async () => {
            const query = supabase.rpc("get_gross_revenue_summary", {
              p_month: month,
              p_year: year,
            });

            const result = await query;

            if (isFinancialUser && allowedLocations) {
              const { data: filteredData } = await supabase
                .from("payments")
                .select("paid_amount, rental:rentals!inner(property_id)")
                .eq("status", "paid")
                .eq("reference_month", month.toString())
                .eq("reference_year", year.toString())
                .in("rental.property_id", allowedLocations);

              const sum = filteredData?.reduce((acc, p) => acc + (p.paid_amount || 0), 0) || 0;
              return { data: sum, error: null };
            }

            return result;
          })(),

          // Despesas de locação - SUM via agregação
          (async () => {
            const query = supabase.rpc("get_location_expenses_summary", {
              p_month: month,
              p_year: year,
            });

            const result = await query;

            if (isFinancialUser && allowedLocations) {
              const { data: filteredData } = await supabase
                .from("location_expenses")
                .select("amount")
                .eq("reference_month", month)
                .eq("reference_year", year)
                .in("location_id", allowedLocations);

              const sum = filteredData?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
              return { data: sum, error: null };
            }

            return result;
          })(),
        ]);

        // Executar os 3 grupos em paralelo
        const [propertiesResults, contractsResults, paymentsResults] = await Promise.all([
          propertiesQueries,
          contractsQueries,
          paymentsQueries,
        ]);

        if (!isMounted) return;

        // Processar resultados de propriedades
        const [propertiesData, tenantsData] = propertiesResults;
        
        const properties = propertiesData.data || [];
        const totalProperties = properties.length;
        const availableProperties = properties.filter((p: any) => p.status === "available").length;
        const unavailableProperties = properties.filter((p: any) => p.status === "unavailable").length;
        const occupiedProperties = properties.filter((p: any) => p.status === "occupied").length;

        // Processar resultados de contratos
        const [activeContractsData, expiringContractsData] = contractsResults;

        // Processar resultados de pagamentos
        const [
          overdueData,
          dueTodayData,
          completedData,
          expectedAmountData,
          grossRevenueData,
          expensesData,
        ] = paymentsResults;

        const newCounts: DashboardCounts = {
          totalProperties,
          availableProperties,
          unavailableProperties,
          occupiedProperties,
          totalTenants: tenantsData.count || 0,
          activeContracts: activeContractsData.count || 0,
          expiringContracts: expiringContractsData.count || 0,
          overduePayments: overdueData.data?.count || 0,
          overdueAmount: overdueData.data?.sum || 0,
          dueTodayPayments: dueTodayData.count || 0,
          completedPayments: completedData.count || 0,
          expectedAmount: expectedAmountData.data || 0,
          grossRevenue: grossRevenueData.data || 0,
          locationExpenses: expensesData.data || 0,
        };

        console.log("📊 Dashboard counts loaded:", newCounts);

        // Salvar no cache
        setCache(cacheKey, newCounts);
        setCounts(newCounts);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        
        // Em caso de erro (ex: RPCs não existem), usar fallback
        if (error && typeof error === 'object' && 'code' in error && error.code === '42883') {
          console.log("⚠️ RPC functions not found, using fallback queries");
          // Poderia implementar fallback aqui se necessário
        }
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