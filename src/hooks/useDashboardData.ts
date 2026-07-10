import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateContractAlert } from "@/lib/contractAlerts";

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
  adminFees: number;
  managementFees: number;
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
    adminFees: 0,
    managementFees: 0,
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

        // 1. Buscar permissões de localização (se financeiro)
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
              adminFees: 0,
              managementFees: 0,
            });
            setLoading(false);
            loadingRef.current = false;
            return;
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Data para 2 meses à frente (para contratos a vencer)
        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        const twoMonthsStr = twoMonthsFromNow.toISOString().split('T')[0];

        console.log("📅 [useDashboardData] Período:", {
          month,
          year,
          today: todayStr,
          twoMonthsFromNow: twoMonthsStr
        });

        // 2. Buscar dados em paralelo
        const [
          exemptLocationsResult,
          propertiesResult,
          tenantsResult,
          rentalsResult,
          paymentsResult,
          expensesResult,
          configResult,
        ] = await Promise.all([
          // Locais isentos
          supabase
            .from("admin_fee_exempt_locations")
            .select("location_id"),

          // Propriedades (com filtro de localização para financeiro)
          (async () => {
            let query = supabase
              .from("properties")
              .select("id, status, location_id");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Inquilinos (via locações com filtro de localização)
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

          // Locações (com filtro de localização para financeiro)
          (async () => {
            let query = supabase
              .from("rentals")
              .select("id, status, end_date, properties!inner(location_id)");
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Pagamentos do mês com JOIN para pegar location_id
          (async () => {
            let query = supabase
              .from("payments")
              .select(`
                id,
                status,
                due_date,
                expected_amount,
                paid_amount,
                rentals!inner(
                  id,
                  properties!inner(
                    location_id
                  )
                )
              `)
              .eq("reference_month", month.toString().padStart(2, '0'))
              .eq("reference_year", year.toString());
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rentals.properties.location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Despesas do mês (com filtro de localização)
          (async () => {
            let query = supabase
              .from("location_expenses")
              .select("amount, location_id")
              .eq("reference_month", month)
              .eq("reference_year", year);
            
            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }
            
            return query;
          })(),

          // Configurações
          supabase
            .from("configs")
            .select("*")
            .maybeSingle(),
        ]);

        if (abortControllerRef.current?.signal.aborted) {
          loadingRef.current = false;
          return;
        }

        // 3. Processar resultados
        const exemptIds = exemptLocationsResult.data?.map(e => e.location_id) || [];
        setExemptLocationIds(exemptIds);

        const config = configResult.data;
        const adminFeePercent = config?.admin_fee_percentage || 0;
        const managementFeePercent = config?.management_fee_percentage || 0;

        // Processar propriedades
        const properties = propertiesResult.data || [];
        const totalProperties = properties.length;
        const availableProperties = properties.filter(p => p.status === "available").length;
        const unavailableProperties = properties.filter(p => p.status === "unavailable").length;
        const occupiedProperties = properties.filter(p => p.status === "occupied").length;

        // Processar inquilinos
        const totalTenants = tenantsResult.data?.length || 0;

        // Processar locações
        const rentals = rentalsResult.data || [];
        const activeContracts = rentals.filter(r => r.status === "active").length;
        
        // 🔥 Contratos a vencer nos próximos 2 meses (apenas ATIVOS não vencidos)
        // USA A MESMA FUNÇÃO que a página de locações para garantir sincronização 100%
        const expiringContracts = rentals.filter(r => {
          if (r.status !== "active" || !r.end_date) return false;
          
          // ✅ Excluir contratos já vencidos
          const endDate = new Date(r.end_date);
          if (endDate < today) return false;
          
          // ✅ USA calculateContractAlert - MESMA lógica da página de locações
          const alert = calculateContractAlert(r.end_date);
          
          // Contar apenas contratos com alerta (amarelo OU vermelho) dentro de 60 dias
          return alert.level === "warning" || alert.level === "critical";
        }).length;

        console.log("🔔 [useDashboardData] Contratos a vencer:", {
          total: activeContracts,
          expiringContracts,
          criteria: "status=active E end_date > hoje E alert (≤60 dias)"
        });

        // 🔥 Processar pagamentos com lógica CORRETA
        const paymentsData = paymentsResult.data || [];
        
        let overduePayments = 0;
        let overdueAmount = 0;
        let dueTodayPayments = 0;
        let completedPayments = 0;
        let pendingPayments = 0;
        let expectedAmount = 0;
        let grossRevenue = 0;
        let adminFees = 0;
        let managementFees = 0;

        console.log("📊 [useDashboardData] Analisando pagamentos:", {
          total: paymentsData.length,
          today: todayStr,
          month,
          year,
          adminFeePercent,
          managementFeePercent
        });

        paymentsData.forEach((payment: any) => {
          const dueDate = payment.due_date;
          const status = payment.status;
          const locationId = payment.rentals?.properties?.location_id;
          const paidAmount = payment.paid_amount || 0;
          const expectedAmountValue = payment.expected_amount || 0;
          
          console.log("💳 [useDashboardData] Processando pagamento:", {
            id: payment.id,
            status,
            dueDate,
            paidAmount,
            expectedAmount: expectedAmountValue,
            locationId,
            isExempt: locationId && exemptIds.includes(locationId)
          });
          
          // Receita esperada = soma de todos os expected_amount do mês
          expectedAmount += expectedAmountValue;
          
          // ✅ PAGO OU PARCIAL: contar como recebido e calcular taxas
          if (status === 'paid' || status === 'partial') {
            if (status === 'paid') {
              completedPayments++;
            }
            
            // Adicionar à receita bruta
            grossRevenue += paidAmount;
            
            console.log("💰 [useDashboardData] Pagamento PAGO/PARCIAL detectado:", {
              paidAmount,
              grossRevenue,
              completedPayments
            });
            
            // Calcular taxas apenas se houver valor pago
            if (paidAmount > 0) {
              const isExempt = locationId && exemptIds.includes(locationId);
              
              // Taxa de Administração (apenas locais não isentos)
              if (!isExempt) {
                const adminFee = paidAmount * (adminFeePercent / 100);
                adminFees += adminFee;
                console.log("💰 [useDashboardData] Taxa Admin calculada:", {
                  paidAmount,
                  percent: adminFeePercent,
                  fee: adminFee,
                  totalAdminFees: adminFees
                });
              }
              
              // Taxa de Gerenciamento (todos os locais)
              const mgmtFee = paidAmount * (managementFeePercent / 100);
              managementFees += mgmtFee;
              console.log("💰 [useDashboardData] Taxa Mgmt calculada:", {
                paidAmount,
                percent: managementFeePercent,
                fee: mgmtFee,
                totalMgmtFees: managementFees
              });
            }
          }
          
          // ✅ ATRASADO: vencimento < hoje E status pending/partial
          if ((status === 'pending' || status === 'partial') && dueDate < todayStr) {
            overduePayments++;
            overdueAmount += expectedAmountValue;
            pendingPayments++;
          } 
          // ✅ VENCE HOJE: vencimento = hoje E status pending/partial
          else if ((status === 'pending' || status === 'partial') && dueDate === todayStr) {
            dueTodayPayments++;
            pendingPayments++;
          }
          // ✅ PENDENTE FUTURO: pending/partial com vencimento futuro
          else if (status === 'pending' || status === 'partial') {
            pendingPayments++;
          }
        });

        console.log("📊 [useDashboardData] TOTAIS CALCULADOS ANTES DAS DESPESAS:", {
          totalPagamentos: paymentsData.length,
          completedPayments,
          pendingPayments,
          grossRevenue,
          expectedAmount,
          adminFees,
          managementFees
        });

        // Processar despesas do mês
        const expensesData = expensesResult.data || [];
        const locationExpenses = expensesData.reduce(
          (sum: number, e: any) => sum + (Number(e.amount) || 0), 
          0
        );

        console.log("📊 [useDashboardData] Resultado da contagem:", {
          completedPayments,
          overduePayments,
          dueTodayPayments,
          pendingPayments,
          grossRevenue,
          overdueAmount,
          adminFees,
          managementFees,
          locationExpenses,
          adminFeePercent,
          managementFeePercent,
          exemptIds: exemptIds.length
        });

        console.log("💰 [useDashboardData] Valores finais calculados:", {
          adminFees,
          managementFees,
          locationExpenses,
          total: adminFees + managementFees + locationExpenses
        });

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
          adminFees,
          managementFees,
        };

        console.log("📦 [useDashboardData] Retornando counts:", newCounts);

        setCache(cacheKey, newCounts);
        setCounts(newCounts);

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("ℹ️ [useDashboardData] Requisição cancelada");
          return;
        }
        
        console.error("❌ [useDashboardData] Error loading dashboard data:", error);
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