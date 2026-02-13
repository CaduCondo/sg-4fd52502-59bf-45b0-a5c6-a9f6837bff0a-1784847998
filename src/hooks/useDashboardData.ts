import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Payment, Property, Rental } from "@/types";

export function useDashboardData(month: number, year: number, userId: string | undefined, userRole: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [locationExpenses, setLocationExpenses] = useState(0);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

  const mapPaymentFromDB = useCallback((data: any): Payment => ({
    id: data.id,
    rentalId: data.rental_id,
    dueDate: data.due_date,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    paymentDate: data.payment_date,
    status: data.status,
    referenceMonth: data.reference_month ? parseInt(data.reference_month) : undefined,
    referenceYear: data.reference_year ? parseInt(data.reference_year) : undefined,
  }), []);

  const mapPropertyFromDB = useCallback((data: any): Property => ({
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
  }), []);

  const mapRentalFromDB = useCallback((data: any): Rental => ({
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
  }), []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (!userId) return;

        setLoading(true);

        // ETAPA 1: Configurações globais + permissões (paralelo)
        const [exemptResult, permissionsResult] = await Promise.all([
          supabase.from("admin_fee_exempt_locations").select("location_id"),
          userRole === "financial" 
            ? supabase.from("user_location_permissions").select("location_id").eq("user_id", userId)
            : Promise.resolve({ data: null, error: null })
        ]);

        if (!isMounted) return;

        const exemptIds = exemptResult.data?.map(e => e.location_id) || [];
        const allowedLocations = permissionsResult.data?.map(p => p.location_id) || [];

        setExemptLocationIds(exemptIds);

        // ETAPA 2: Properties + Tenants Count (paralelo, apenas campos essenciais)
        let propertiesQuery = supabase
          .from("properties")
          .select("id, status, location_id");
        
        if (userRole === "financial" && allowedLocations.length > 0) {
          propertiesQuery = propertiesQuery.in("location_id", allowedLocations);
        }

        const [propertiesResult, tenantsCountResult] = await Promise.all([
          propertiesQuery,
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .neq("status", "inactive")
        ]);

        if (!isMounted) return;

        if (propertiesResult.error) throw propertiesResult.error;
        if (tenantsCountResult.error) throw tenantsCountResult.error;

        const allowedPropertyIds = (propertiesResult.data || []).map(p => p.id);

        // Early return se não há properties
        if (userRole === "financial" && allowedPropertyIds.length === 0) {
          setPayments([]);
          setProperties([]);
          setRentals([]);
          setTenantsCount(tenantsCountResult.count || 0);
          setLocationExpenses(0);
          setLoading(false);
          return;
        }

        // ETAPA 3: Rentals (apenas campos necessários)
        let rentalsQuery = supabase
          .from("rentals")
          .select("id, property_id, tenant_id, start_date, end_date, monthly_rent, value, is_active, status");
        
        if (userRole === "financial" && allowedPropertyIds.length > 0) {
          rentalsQuery = rentalsQuery.in("property_id", allowedPropertyIds);
        }

        const rentalsResult = await rentalsQuery;
        
        if (!isMounted) return;
        if (rentalsResult.error) throw rentalsResult.error;

        const activeRentalIds = (rentalsResult.data || [])
          .filter(r => r.is_active)
          .map(r => r.id);

        // Early return se não há rentals ativos
        if (userRole === "financial" && activeRentalIds.length === 0) {
          setPayments([]);
          setProperties(propertiesResult.data.map(mapPropertyFromDB));
          setRentals(rentalsResult.data.map(mapRentalFromDB));
          setTenantsCount(tenantsCountResult.count || 0);
          setLocationExpenses(0);
          setLoading(false);
          return;
        }

        // ETAPA 4: Payments + Expenses (paralelo, apenas campos necessários)
        let paymentsQuery = supabase
          .from("payments")
          .select("id, rental_id, due_date, expected_amount, paid_amount, payment_date, status, reference_month, reference_year")
          .eq("reference_month", month.toString())
          .eq("reference_year", year.toString());

        if (userRole === "financial" && activeRentalIds.length > 0) {
          paymentsQuery = paymentsQuery.in("rental_id", activeRentalIds);
        }

        let expensesQuery = supabase
          .from("location_expenses")
          .select("amount")
          .eq("reference_month", month)
          .eq("reference_year", year);
        
        if (userRole === "financial" && allowedLocations.length > 0) {
          expensesQuery = expensesQuery.in("location_id", allowedLocations);
        }

        const [paymentsResult, expensesResult] = await Promise.all([
          paymentsQuery,
          expensesQuery
        ]);

        if (!isMounted) return;

        if (paymentsResult.error) throw paymentsResult.error;
        if (expensesResult.error) throw expensesResult.error;

        const totalExpenses = (expensesResult.data || [])
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        // Atualizar estados
        setPayments((paymentsResult.data || []).map(mapPaymentFromDB));
        setProperties((propertiesResult.data || []).map(mapPropertyFromDB));
        setRentals((rentalsResult.data || []).map(mapRentalFromDB));
        setTenantsCount(tenantsCountResult.count || 0);
        setLocationExpenses(totalExpenses);

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
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
  }, [month, year, userId, userRole, mapPaymentFromDB, mapPropertyFromDB, mapRentalFromDB]);

  return { loading, payments, properties, rentals, tenantsCount, locationExpenses, exemptLocationIds };
}