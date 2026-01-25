import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllPayments } from "@/services/paymentService";
import { getConfig } from "@/services/configService";
import type { Property, Tenant, Rental, Payment } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  totalProperties: number;
  availableProperties: number;
  occupiedProperties: number;
  unavailableProperties: number;
  activeRentals: number;
  totalTenants: number;
  monthlyRevenue: number;
  adminFee: number;
  netRevenue: number;
  expectedValue: number;
  paidPayments: number;
  pendingPayments: number;
  overduePayments: number;
}

export function useDashboardData(selectedMonth: number | null, selectedYear: number | null) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [adminFeePercentage, setAdminFeePercentage] = useState(5);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [dueSoonPayments, setDueSoonPayments] = useState<Payment[]>([]);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);
  const [userLocationIds, setUserLocationIds] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    unavailableProperties: 0,
    activeRentals: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    adminFee: 0,
    netRevenue: 0,
    expectedValue: 0,
    paidPayments: 0,
    pendingPayments: 0,
    overduePayments: 0,
  });

  const loadData = async () => {
    if (!selectedMonth || !selectedYear || !user) return;

    try {
      setIsLoading(true);

      // 1. Identificar Role do Usuário e Permissões de Local
      const { data: userData } = await supabase
        .from("system_users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      const userRole = userData?.role || "unknown";
      const isRestricted = userRole !== "admin" && userRole !== "owner";
      let allowedLocationIds: string[] = [];

      // Carregar isenções (sempre necessário para cálculo de taxas)
      const { data: exemptions } = await supabase
        .from("user_fee_exemptions")
        .select("location_id")
        .eq("user_id", user.id);
      const exemptIds = exemptions?.map(e => e.location_id) || [];
      setExemptLocationIds(exemptIds);

      // Se restrito, buscar locais permitidos
      if (isRestricted) {
        const { data: permissions } = await supabase
          .from("user_location_permissions")
          .select("location_id")
          .eq("user_id", user.id)
          .eq("can_view", true); // CRUCIAL: Apenas onde tem permissão de ver
        
        allowedLocationIds = permissions?.map(p => p.location_id) || [];
        setUserLocationIds(allowedLocationIds); // Para debug se necessário
      } else {
        setUserLocationIds([]); // Admin vê tudo (array vazio aqui significa sem filtro na logica visual, mas na logica de dados trataremos diferente)
      }

      // 2. Carregar Dados Brutos
      const { data: rentalsDataRaw } = await supabase
        .from("rentals")
        .select("*")
        .eq("is_active", true);

      const mappedRentals: any[] = (rentalsDataRaw || []).map((r: any) => ({
        ...r,
        propertyId: r.property_id,
        tenantId: r.tenant_id,
        startDate: r.start_date,
        endDate: r.end_date,
        rentAmount: r.rent_amount || r.value,
        isActive: r.is_active,
        depositAmount: r.deposit,
        paymentDay: r.payment_day,
        autoRenew: r.auto_renew,
        hasGarage: r.has_garage,
        garageValue: r.garage_value
      }));

      const [propertiesData, tenantsData, paymentsData, configData] = await Promise.all([
        getAllProperties(),
        getAllTenants(),
        getAllPayments(),
        getConfig()
      ]);

      if (configData) {
        setAdminFeePercentage(configData.admin_fee_percentage);
      }

      // 3. APLICAR FILTROS DE PERMISSÃO
      let finalProperties = propertiesData;
      let finalRentals = mappedRentals;
      let finalPayments = paymentsData;

      if (isRestricted) {
        // Filtra propriedades pelos locais permitidos
        finalProperties = propertiesData.filter(p => allowedLocationIds.includes(p.locationId));
        
        // Filtra aluguéis baseados nas propriedades visíveis
        const visiblePropertyIds = finalProperties.map(p => p.id);
        finalRentals = mappedRentals.filter(r => visiblePropertyIds.includes(r.propertyId));

        // Filtra pagamentos baseados nos aluguéis visíveis
        const visibleRentalIds = finalRentals.map(r => r.id);
        finalPayments = paymentsData.filter(p => visibleRentalIds.includes(p.rentalId));
      }

      // 4. Atualizar Estado com Dados FILTRADOS
      setProperties(finalProperties);
      setTenants(tenantsData); // Tenants não filtramos estritamente aqui, mas o uso deles nas stats será via rentals filtrados
      setRentals(finalRentals);
      setPayments(finalPayments);
      
      // 5. Calcular Estatísticas
      calculateStats(finalProperties, finalRentals, finalPayments, tenantsData, exemptIds); // Passamos exemptIds diretamente
      
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (
    props: Property[],
    rents: Rental[],
    pays: Payment[],
    tens: Tenant[],
    currentExemptIds?: string[] // Novo parâmetro opcional
  ) => {
    if (!selectedMonth || !selectedYear) return;

    // Usa o parâmetro se fornecido, senão usa o estado (fallback)
    const activeExemptIds = currentExemptIds || exemptLocationIds;

    const periodPayments = pays.filter((payment) => {
      const dueDate = new Date(payment.dueDate);
      return (
        dueDate.getMonth() === (selectedMonth - 1) &&
        dueDate.getFullYear() === selectedYear
      );
    });

    const activeRentalsInPeriod = rents.filter((rental) => rental.isActive);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = periodPayments.filter(p => {
      if (p.status !== "pending" && p.status !== "partial") return false;
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    const paidCount = periodPayments.filter(p => p.status === "paid").length;
    const pendingCount = periodPayments.filter(p => p.status === "pending").length;

    const expected = periodPayments.reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

    const paidPaymentsList = periodPayments.filter((p) => p.status === "paid" || p.status === "partial");
    const revenue = paidPaymentsList.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const feeRate = (adminFeePercentage || 0) / 100;
    const adminFee = paidPaymentsList.reduce((sum, p) => {
      const rental = rents.find(r => r.id === p.rentalId);
      const property = props.find(prop => prop.id === rental?.propertyId);
      
      // Usa activeExemptIds em vez do estado direto
      if (property && activeExemptIds.includes(property.locationId)) {
        return sum;
      }
      
      return sum + ((p.paidAmount || 0) * feeRate);
    }, 0);

    const net = revenue - adminFee;

    const dueSoon = pays
      .filter(p => {
        if (p.status === "paid") return false;
        const dueDate = new Date(p.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= -30 && diffDays <= 30;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    const activeTenants = tens.filter(t => t.status === "active" || t.status === "rented");

    setFilteredPayments(periodPayments);
    setDueSoonPayments(dueSoon);
    
    setStats({
      totalProperties: props.length,
      availableProperties: props.filter((p) => p.status === "available").length,
      occupiedProperties: props.filter((p) => p.status === "occupied").length,
      unavailableProperties: props.filter((p) => p.status === "unavailable").length,
      activeRentals: activeRentalsInPeriod.length,
      totalTenants: activeTenants.length,
      monthlyRevenue: revenue,
      adminFee: adminFee,
      netRevenue: net,
      expectedValue: expected,
      paidPayments: paidCount,
      pendingPayments: pendingCount,
      overduePayments: overdueCount,
    });
  };

  return {
    isLoading,
    properties,
    tenants,
    rentals,
    payments,
    adminFeePercentage,
    filteredPayments,
    dueSoonPayments,
    stats,
    loadData
  };
}