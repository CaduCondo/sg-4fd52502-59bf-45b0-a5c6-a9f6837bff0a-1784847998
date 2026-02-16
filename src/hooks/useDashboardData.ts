import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Payment, Property, Rental } from "@/types";

interface DashboardData {
  loading: boolean;
  payments: Payment[];
  properties: Property[];
  rentals: Rental[];
  tenantsCount: number;
  locationExpenses: number;
  exemptLocationIds: string[];
}

const mapPaymentFromDB = (data: any): Payment => ({
  id: data.id,
  rentalId: data.rental_id,
  dueDate: data.due_date,
  expectedAmount: data.expected_amount,
  paidAmount: data.paid_amount,
  paymentDate: data.payment_date,
  status: data.status,
  referenceMonth: data.reference_month ? parseInt(data.reference_month) : undefined,
  referenceYear: data.reference_year ? parseInt(data.reference_year) : undefined,
});

const mapPropertyFromDB = (data: any): Property => ({
  id: data.id,
  status: data.status,
  locationId: data.location_id,
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  value: 0,
  monthlyRent: 0,
  images: [],
});

const mapRentalFromDB = (data: any): Rental => ({
  id: data.id,
  propertyId: data.property_id,
  tenantId: data.tenant_id,
  startDate: data.start_date,
  endDate: data.end_date,
  value: Number(data.monthly_rent || data.value),
  isActive: data.is_active,
  paymentDay: 0,
  status: data.status,
  depositAmount: 0,
  hasGarage: false,
  hasPartnerBroker: false,
  attachments: [],
  contractAttachments: [],
  autoRenew: false,
});

export function useDashboardData(
  month: number,
  year: number,
  userId: string | undefined,
  userRole: string | undefined
): DashboardData {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [locationExpenses, setLocationExpenses] = useState(0);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

  const isFinancialUser = useMemo(() => userRole === "financial", [userRole]);

  const fetchExemptLocations = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_fee_exempt_locations")
      .select("location_id");

    if (error) throw error;
    return data?.map(e => e.location_id) || [];
  }, []);

  const fetchUserPermissions = useCallback(async (uid: string) => {
    if (!isFinancialUser) return null;

    const { data, error } = await supabase
      .from("user_location_permissions")
      .select("location_id")
      .eq("user_id", uid);

    if (error) throw error;
    return data?.map(p => p.location_id) || [];
  }, [isFinancialUser]);

  const fetchProperties = useCallback(async (allowedLocations: string[] | null) => {
    let query = supabase
      .from("properties")
      .select("id, status, location_id");

    if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
      query = query.in("location_id", allowedLocations);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [isFinancialUser]);

  const fetchTenantsCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .neq("status", "inactive");

    if (error) throw error;
    return count || 0;
  }, []);

  const fetchRentals = useCallback(async (propertyIds: string[]) => {
    if (isFinancialUser && propertyIds.length === 0) return [];

    let query = supabase
      .from("rentals")
      .select("id, property_id, tenant_id, start_date, end_date, monthly_rent, value, is_active, status");

    if (isFinancialUser && propertyIds.length > 0) {
      query = query.in("property_id", propertyIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [isFinancialUser]);

  const fetchPayments = useCallback(async (rentalIds: string[], m: number, y: number) => {
    if (isFinancialUser && rentalIds.length === 0) return [];

    let query = supabase
      .from("payments")
      .select("id, rental_id, due_date, expected_amount, paid_amount, payment_date, status, reference_month, reference_year")
      .eq("reference_month", m.toString())
      .eq("reference_year", y.toString());

    if (isFinancialUser && rentalIds.length > 0) {
      query = query.in("rental_id", rentalIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [isFinancialUser]);

  const fetchLocationExpenses = useCallback(async (allowedLocations: string[] | null, m: number, y: number) => {
    let query = supabase
      .from("location_expenses")
      .select("amount")
      .eq("reference_month", m)
      .eq("reference_year", y);

    if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
      query = query.in("location_id", allowedLocations);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  }, [isFinancialUser]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [exemptIds, allowedLocations] = await Promise.all([
          fetchExemptLocations(),
          fetchUserPermissions(userId)
        ]);

        if (!isMounted) return;
        setExemptLocationIds(exemptIds);

        const [propertiesData, tenantsCountData] = await Promise.all([
          fetchProperties(allowedLocations),
          fetchTenantsCount()
        ]);

        if (!isMounted) return;

        const propertyIds = propertiesData.map(p => p.id);

        if (isFinancialUser && propertyIds.length === 0) {
          setPayments([]);
          setProperties(propertiesData.map(mapPropertyFromDB));
          setRentals([]);
          setTenantsCount(tenantsCountData);
          setLocationExpenses(0);
          setLoading(false);
          return;
        }

        const rentalsData = await fetchRentals(propertyIds);

        if (!isMounted) return;

        const activeRentalIds = rentalsData
          .filter(r => r.is_active)
          .map(r => r.id);

        if (isFinancialUser && activeRentalIds.length === 0) {
          setPayments([]);
          setProperties(propertiesData.map(mapPropertyFromDB));
          setRentals(rentalsData.map(mapRentalFromDB));
          setTenantsCount(tenantsCountData);
          setLocationExpenses(0);
          setLoading(false);
          return;
        }

        const [paymentsData, expensesTotal] = await Promise.all([
          fetchPayments(activeRentalIds, month, year),
          fetchLocationExpenses(allowedLocations, month, year)
        ]);

        if (!isMounted) return;

        setPayments(paymentsData.map(mapPaymentFromDB));
        setProperties(propertiesData.map(mapPropertyFromDB));
        setRentals(rentalsData.map(mapRentalFromDB));
        setTenantsCount(tenantsCountData);
        setLocationExpenses(expensesTotal);

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
  }, [
    month,
    year,
    userId,
    isFinancialUser,
    fetchExemptLocations,
    fetchUserPermissions,
    fetchProperties,
    fetchTenantsCount,
    fetchRentals,
    fetchPayments,
    fetchLocationExpenses
  ]);

  return {
    loading,
    payments,
    properties,
    rentals,
    tenantsCount,
    locationExpenses,
    exemptLocationIds
  };
}