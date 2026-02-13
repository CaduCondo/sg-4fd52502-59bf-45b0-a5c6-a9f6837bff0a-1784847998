import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Payment, Property, Rental } from "@/types";

export function useDashboardData(month: number, year: number, userId: string | undefined, userRole: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [locationExpenses, setLocationExpenses] = useState<number>(0);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

  // Memoizar as funções de mapeamento
  const mapPaymentFromDB = useCallback((data: any): Payment => ({
    ...data,
    rentalId: data.rental_id,
    dueDate: data.due_date,
    expectedAmount: data.expected_amount,
    paidAmount: data.paid_amount,
    paymentDate: data.payment_date,
    paymentMethod: data.payment_method,
    referenceMonth: data.reference_month ? parseInt(data.reference_month) : undefined,
    referenceYear: data.reference_year ? parseInt(data.reference_year) : undefined,
    receiptUrl: data.receipt_url,
    penaltyAmount: data.penalty_amount,
    interestAmount: data.interest_amount,
    discountAmount: data.discount_amount,
    paymentCode: data.payment_code,
    lateFee: data.late_fee,
    interest: data.interest,
    paymentLocation: data.payment_location,
  }), []);

  const mapPropertyFromDB = useCallback((data: any): Property => ({
    id: data.id,
    address: data.address,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
    zipCode: data.zip_code,
    value: Number(data.value),
    monthlyRent: Number(data.monthly_rent),
    description: data.description,
    area: Number(data.area),
    bathrooms: Number(data.bathrooms),
    hasGarage: data.has_garage,
    acceptsPets: data.accepts_pets,
    hasFurniture: data.has_furniture,
    hasPartnerBroker: data.has_partner_broker,
    status: data.status,
    locationId: data.location_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    images: data.photos || [],
  }), []);

  const mapRentalFromDB = useCallback((data: any): Rental => ({
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    value: Number(data.value || data.monthly_rent),
    paymentDay: Number(data.payment_day),
    status: data.status,
    isActive: data.is_active,
    depositAmount: Number(data.deposit),
    depositInstallments: data.deposit_installments,
    depositInstallment1: data.deposit_installment_1,
    depositInstallment2: data.deposit_installment_2,
    depositInstallment3: data.deposit_installment_3,
    hasGarage: data.has_garage,
    garageValue: data.garage_value,
    hasPartnerBroker: data.has_partner_broker,
    contractAttachments: data.contract_attachments,
    attachments: data.attachments,
    autoRenew: false
  }), []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (!userId) return;

        setLoading(true);

        // PASSO 1: Carregar configurações globais e permissões (paralelo)
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
        setAllowedLocationIds(allowedLocations);

        // PASSO 2: Carregar dados principais (paralelo)
        let propertiesQuery = supabase
          .from("properties")
          .select("id, status, location_id, value, monthly_rent, photos");
        
        if (userRole === "financial" && allowedLocations.length > 0) {
          propertiesQuery = propertiesQuery.in("location_id", allowedLocations);
        }

        const [propertiesResult, tenantsResult] = await Promise.all([
          propertiesQuery,
          supabase.from("tenants").select("id, status, name").neq("status", "inactive")
        ]);

        if (!isMounted) return;

        if (propertiesResult.error) throw propertiesResult.error;
        if (tenantsResult.error) throw tenantsResult.error;

        const allowedPropertyIds = (propertiesResult.data || []).map(p => p.id);

        // Early return se não há properties
        if (userRole === "financial" && allowedPropertyIds.length === 0) {
          setPayments([]);
          setProperties([]);
          setRentals([]);
          setTenants([]);
          setLocationExpenses(0);
          setLoading(false);
          return;
        }

        // PASSO 3: Carregar rentals e dados dependentes (paralelo)
        let rentalsQuery = supabase.from("rentals").select("*");
        
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
          setTenants(tenantsResult.data || []);
          setLocationExpenses(0);
          setLoading(false);
          return;
        }

        // PASSO 4: Carregar payments e expenses (paralelo)
        let paymentsQuery = supabase
          .from("payments")
          .select("*")
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

        // Atualizar todos os estados de uma vez
        setPayments((paymentsResult.data || []).map(mapPaymentFromDB));
        setProperties((propertiesResult.data || []).map(mapPropertyFromDB));
        setRentals((rentalsResult.data || []).map(mapRentalFromDB));
        setTenants(tenantsResult.data || []);
        setLocationExpenses(totalExpenses);

      } catch (error) {
        console.error("❌ Erro ao carregar dados do dashboard:", error);
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

  return { loading, payments, properties, rentals, tenants, allowedLocationIds, locationExpenses, exemptLocationIds };
}