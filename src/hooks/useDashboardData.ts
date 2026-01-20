import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllPayments } from "@/services/paymentService";
import { getConfig } from "@/services/configService";
import type { Property, Tenant, Rental, Payment } from "@/types";

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
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [adminFeePercentage, setAdminFeePercentage] = useState(6);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [dueSoonPayments, setDueSoonPayments] = useState<Payment[]>([]);
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
    if (!selectedMonth || !selectedYear) return;

    try {
      setIsLoading(true);

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

      setProperties(propertiesData);
      setTenants(tenantsData);
      setRentals(mappedRentals);
      setPayments(paymentsData);
      
      calculateStats(propertiesData, mappedRentals, paymentsData, tenantsData);
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
    tens: Tenant[]
  ) => {
    if (!selectedMonth || !selectedYear) return;

    const activeRentalsInPeriod = rents.filter((rental) => {
      if (!rental.isActive) return false;
      const startDate = new Date(rental.startDate);
      const endDate = rental.endDate ? new Date(rental.endDate) : null;
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const monthEnd = new Date(selectedYear, selectedMonth, 0);

      const startsBeforeMonthEnd = startDate <= monthEnd;
      const endsAfterMonthStart = !endDate || endDate >= monthStart;

      return startsBeforeMonthEnd && endsAfterMonthStart;
    });

    const periodPayments = pays.filter(
      (p) => p.referenceMonth === selectedMonth && p.referenceYear === selectedYear
    );

    const paid = periodPayments.filter((p) => p.status === "paid");
    const overdue = periodPayments.filter((p) => p.status === "overdue");
    const pending = periodPayments.filter(
      (p) => p.status === "pending" || p.status === "partial"
    );

    const revenue = paid.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    let fee = 0;
    for (const payment of paid) {
      const rental = rents.find(r => r.id === payment.rentalId);
      const property = rental ? props.find(p => p.id === rental.propertyId) : undefined;
      if (property && property.location.toLowerCase() !== "outros") {
        const paymentFee = (payment.paidAmount || 0) * (adminFeePercentage / 100);
        fee += paymentFee;
      }
    }

    const net = revenue - fee;
    const expected = periodPayments.reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoon = pays.filter(p => {
      if (p.status === "paid") return false;
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });

    const activeTenants = tens.filter(t => t.status === "active" || t.status === "tenant");

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
      adminFee: fee,
      netRevenue: net,
      expectedValue: expected,
      paidPayments: paid.length,
      pendingPayments: pending.length,
      overduePayments: overdue.length,
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