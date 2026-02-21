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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Buscar permissões de localização do usuário (se financeiro)
        let allowedLocations: string[] | null = null;
        if (isFinancialUser) {
          const { data: permData } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);
          
          allowedLocations = permData?.map(p => p.location_id) || [];
          
          // Se usuário financeiro não tem permissões, retornar vazio
          if (allowedLocations.length === 0) {
            setPayments([]);
            setProperties([]);
            setRentals([]);
            setTenantsCount(0);
            setLocationExpenses(0);
            setExemptLocationIds([]);
            setLoading(false);
            return;
          }
        }

        // 2. Executar queries principais em paralelo com otimizações
        const [
          exemptLocationsResult,
          propertiesResult,
          tenantsCountResult,
          rentalsResult,
          paymentsResult,
          expensesResult
        ] = await Promise.all([
          // Locais isentos de taxa administrativa
          supabase
            .from("admin_fee_exempt_locations")
            .select("location_id"),

          // Propriedades com join de locations (otimizado)
          (async () => {
            let query = supabase
              .from("properties")
              .select(`
                id,
                location_id,
                property_identifier,
                complement,
                description,
                rooms,
                bathrooms,
                area,
                value,
                monthly_rent,
                has_garage,
                has_furniture,
                accepts_pets,
                status,
                images,
                created_at,
                features,
                locations!inner(
                  id,
                  name,
                  street,
                  number,
                  neighborhood,
                  city,
                  state,
                  zip_code
                )
              `);

            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("location_id", allowedLocations);
            }

            return query;
          })(),

          // Contagem de inquilinos
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .neq("status", "inactive"),

          // Locações com dados relacionados (otimizado)
          (async () => {
            let query = supabase
              .from("rentals")
              .select(`
                id,
                property_id,
                tenant_id,
                start_date,
                end_date,
                monthly_rent,
                value,
                is_active,
                status,
                properties!inner(location_id)
              `);

            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("properties.location_id", allowedLocations);
            }

            return query;
          })(),

          // Pagamentos do mês atual apenas
          (async () => {
            let query = supabase
              .from("payments")
              .select(`
                id,
                rental_id,
                due_date,
                expected_amount,
                paid_amount,
                payment_date,
                status,
                reference_month,
                reference_year,
                discount_amount,
                late_fee,
                interest,
                notes,
                payment_method,
                breakdown,
                rentals!inner(
                  property_id,
                  tenant_id,
                  properties!inner(location_id)
                )
              `)
              .eq("reference_month", month.toString())
              .eq("reference_year", year.toString());

            if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
              query = query.in("rentals.properties.location_id", allowedLocations);
            }

            return query;
          })(),

          // Despesas do mês atual
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

        // Formatar propriedades
        const formattedProperties: Property[] = (propertiesResult.data || []).map((prop: any) => ({
          id: prop.id,
          locationId: prop.location_id,
          location: prop.locations?.name || "Local não encontrado",
          propertyIdentifier: prop.property_identifier || "",
          complement: prop.complement || "",
          description: prop.description || "",
          rooms: prop.rooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          value: Number(prop.value || 0),
          monthlyRent: Number(prop.monthly_rent || prop.value || 0),
          hasGarage: prop.has_garage || false,
          hasFurniture: prop.has_furniture || false,
          acceptsPets: prop.accepts_pets || false,
          status: prop.status as "available" | "occupied" | "unavailable",
          images: prop.images || [],
          createdAt: prop.created_at,
          address: prop.locations 
            ? `${prop.locations.street || ''}, ${prop.locations.number || ''} - ${prop.locations.neighborhood || ''}, ${prop.locations.city || ''}/${prop.locations.state || ''}` 
            : "",
          features: prop.features || [],
          locationDetails: prop.locations,
          number: prop.number || prop.locations?.number || "",
          neighborhood: prop.neighborhood || prop.locations?.neighborhood || "",
          city: prop.city || prop.locations?.city || "",
          state: prop.state || prop.locations?.state || "",
          zipCode: prop.zip_code || prop.locations?.zip_code || "",
        }));

        setProperties(formattedProperties);

        // Formatar locações
        const formattedRentals: Rental[] = (rentalsResult.data || []).map((rental: any) => ({
          id: rental.id,
          propertyId: rental.property_id,
          tenantId: rental.tenant_id,
          startDate: rental.start_date,
          endDate: rental.end_date,
          value: Number(rental.monthly_rent || rental.value),
          monthlyRent: Number(rental.monthly_rent || rental.value),
          isActive: rental.is_active,
          paymentDay: 0,
          status: rental.status,
          depositAmount: 0,
          hasGarage: false,
          hasPartnerBroker: false,
          attachments: [],
          contractAttachments: [],
          autoRenew: false,
        }));

        setRentals(formattedRentals);

        // Formatar pagamentos
        const formattedPayments: Payment[] = (paymentsResult.data || []).map((payment: any) => ({
          id: payment.id,
          rentalId: payment.rental_id,
          propertyId: payment.rentals?.property_id || "",
          tenantId: payment.rentals?.tenant_id || "",
          dueDate: payment.due_date || payment.payment_date,
          expectedAmount: Number(payment.expected_amount),
          paidAmount: Number(payment.paid_amount),
          paymentDate: payment.payment_date,
          status: payment.status,
          referenceMonth: parseInt(payment.reference_month),
          referenceYear: parseInt(payment.reference_year),
          discount: Number(payment.discount_amount || 0),
          lateFee: Number(payment.late_fee || 0),
          interest: Number(payment.interest || 0),
          notes: payment.notes || "",
          paymentMethod: payment.payment_method || "",
          breakdown: payment.breakdown,
          type: "rent",
        }));

        setPayments(formattedPayments);

        // Contagem de inquilinos
        setTenantsCount(tenantsCountResult.count || 0);

        // Total de despesas
        const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        setLocationExpenses(totalExpenses);

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
  }, [month, year, userId, userRole, isFinancialUser]);

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