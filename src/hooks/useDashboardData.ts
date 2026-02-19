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
  propertyId: data.property_id || "", 
  tenantId: data.tenant_id || "",
  dueDate: data.due_date,
  expectedAmount: data.expected_amount,
  paidAmount: data.paid_amount,
  paymentDate: data.payment_date,
  status: data.status as "paid" | "pending" | "overdue" | "partial",
  referenceMonth: data.reference_month ? parseInt(data.reference_month) : 0,
  referenceYear: data.reference_year ? parseInt(data.reference_year) : 0,
  discount: data.discount_amount || 0,
  lateFee: data.late_fee || 0,
  interest: data.interest || 0,
  notes: data.notes || "",
  paymentMethod: data.payment_method || "",
  breakdown: data.breakdown,
  installment: data.installment,
  totalInstallments: data.total_installments,
});

const mapPropertyFromDB = (data: any): Property => ({
  id: data.id,
  status: data.status,
  locationId: data.location_id,
  location: "", // Default
  propertyIdentifier: "", // Default
  complement: "", // Default
  rooms: 0,
  bathrooms: 0,
  area: 0,
  hasGarage: false,
  hasFurniture: false,
  acceptsPets: false,
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  value: 0,
  monthlyRent: 0,
  images: [],
  description: "",
  features: [],
  createdAt: new Date().toISOString(),
});

const mapRentalFromDB = (data: any): Rental => ({
  id: data.id,
  propertyId: data.property_id,
  tenantId: data.tenant_id,
  startDate: data.start_date,
  endDate: data.end_date,
  value: Number(data.monthly_rent || data.value),
  monthlyRent: Number(data.monthly_rent || data.value),
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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        console.log("🔍 [DASHBOARD] Iniciando carregamento de dados:", {
          userId,
          userRole,
          isFinancialUser,
          month,
          year
        });

        // 1. Buscar locais permitidos para usuários financeiros
        let allowedLocationIds: string[] = [];
        
        if (isFinancialUser) {
          console.log("🔐 [DASHBOARD] Usuário financeiro detectado - buscando permissões de locais...");
          
          const { data: permissionsData, error: permError } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);

          if (permError) {
            console.error("❌ [DASHBOARD] Erro ao buscar permissões:", permError);
            throw permError;
          }

          allowedLocationIds = permissionsData?.map(p => p.location_id) || [];
          
          console.log("✅ [DASHBOARD] Locais permitidos encontrados:", {
            count: allowedLocationIds.length,
            locationIds: allowedLocationIds
          });

          if (allowedLocationIds.length === 0) {
            console.warn("⚠️ [DASHBOARD] Usuário financeiro sem locais configurados - retornando dados vazios");
            if (isMounted) {
              setPayments([]);
              setProperties([]);
              setRentals([]);
              setTenantsCount(0);
              setLocationExpenses(0);
              setExemptLocationIds([]);
              setLoading(false);
            }
            return;
          }
        }

        // 2. Buscar isenções de taxa (global)
        const { data: exemptData } = await supabase
          .from("admin_fee_exempt_locations")
          .select("location_id");
        
        const exemptIds = exemptData?.map(e => e.location_id) || [];
        if (isMounted) {
          setExemptLocationIds(exemptIds);
        }

        // 3. Buscar propriedades (com filtro de locais para financeiro)
        let propertiesQuery = supabase
          .from("properties")
          .select(`
            *,
            locations(id, name, street, number, neighborhood, city, state, zip_code)
          `);

        if (isFinancialUser && allowedLocationIds.length > 0) {
          console.log("🔒 [DASHBOARD] Aplicando filtro de locais nas propriedades:", allowedLocationIds);
          propertiesQuery = propertiesQuery.in("location_id", allowedLocationIds);
        }

        const { data: propertiesData, error: propsError } = await propertiesQuery;

        if (propsError) throw propsError;

        console.log("✅ [DASHBOARD] Propriedades carregadas:", {
          total: propertiesData?.length || 0,
          filtered: isFinancialUser,
          allowedLocations: allowedLocationIds.length
        });

        const propertyIds = (propertiesData || []).map(p => p.id);

        if (isFinancialUser && propertyIds.length === 0) {
          console.warn("⚠️ [DASHBOARD] Nenhuma propriedade encontrada nos locais permitidos");
          if (isMounted) {
            setPayments([]);
            setProperties([]);
            setRentals([]);
            setTenantsCount(0);
            setLocationExpenses(0);
            setLoading(false);
          }
          return;
        }

        // 4. Buscar aluguéis (filtrados por propriedades)
        let rentalsQuery = supabase
          .from("rentals")
          .select("*");

        if (isFinancialUser && propertyIds.length > 0) {
          console.log("🔒 [DASHBOARD] Aplicando filtro de propriedades nos aluguéis:", propertyIds.length);
          rentalsQuery = rentalsQuery.in("property_id", propertyIds);
        }

        const { data: rentalsData, error: rentalsError } = await rentalsQuery;

        if (rentalsError) throw rentalsError;

        console.log("✅ [DASHBOARD] Aluguéis carregados:", {
          total: rentalsData?.length || 0,
          active: rentalsData?.filter(r => r.is_active).length || 0
        });

        const activeRentalIds = (rentalsData || []).filter(r => r.is_active).map(r => r.id);

        // 5. Buscar pagamentos (filtrados por aluguéis ativos)
        let paymentsQuery = supabase
          .from("payments")
          .select(`
            *,
            rentals(
              id,
              property_id,
              tenant_id,
              start_date,
              end_date,
              monthly_rent,
              value,
              is_active,
              status,
              payment_code
            ),
            properties(
              id,
              location_id,
              property_identifier,
              complement,
              locations(name)
            ),
            tenants(
              id,
              name
            )
          `)
          .eq("reference_month", month.toString())
          .eq("reference_year", year.toString());

        if (isFinancialUser && activeRentalIds.length > 0) {
          console.log("🔒 [DASHBOARD] Aplicando filtro de aluguéis nos pagamentos:", activeRentalIds.length);
          paymentsQuery = paymentsQuery.in("rental_id", activeRentalIds);
        } else if (isFinancialUser && activeRentalIds.length === 0) {
          console.warn("⚠️ [DASHBOARD] Nenhum aluguel ativo encontrado - sem pagamentos");
          if (isMounted) {
            setPayments([]);
            setProperties(propertiesData?.map((prop: any) => ({
              ...mapPropertyFromDB(prop),
              location: prop.locations?.name || "N/A",
              address: prop.locations ? `${prop.locations.street || ''}, ${prop.locations.number || ''} - ${prop.locations.neighborhood || ''}, ${prop.locations.city || ''}/${prop.locations.state || ''}` : "",
              locationDetails: prop.locations,
            })) || []);
            setRentals(rentalsData?.map(mapRentalFromDB) || []);
            setTenantsCount(0);
            setLocationExpenses(0);
            setLoading(false);
          }
          return;
        }

        const { data: paymentsData, error: paymentsError } = await paymentsQuery;

        if (paymentsError) throw paymentsError;

        console.log("✅ [DASHBOARD] Pagamentos carregados:", {
          total: paymentsData?.length || 0,
          month,
          year
        });

        // 6. Contar inquilinos únicos (via aluguéis ativos nas propriedades permitidas)
        let tenantsCount = 0;
        
        if (isFinancialUser && propertyIds.length > 0) {
          const { data: activeTenants } = await supabase
            .from("rentals")
            .select("tenant_id")
            .eq("is_active", true)
            .in("property_id", propertyIds);
          
          const uniqueTenantIds = new Set(activeTenants?.map(r => r.tenant_id) || []);
          tenantsCount = uniqueTenantIds.size;
          
          console.log("✅ [DASHBOARD] Inquilinos contados (via aluguéis ativos):", tenantsCount);
        } else if (!isFinancialUser) {
          const { count } = await supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .neq("status", "inactive");
          
          tenantsCount = count || 0;
          console.log("✅ [DASHBOARD] Total de inquilinos (admin):", tenantsCount);
        }

        // 7. Buscar despesas de locais do período
        let expensesQuery = supabase
          .from("location_expenses")
          .select("amount")
          .eq("reference_month", month)
          .eq("reference_year", year);

        if (isFinancialUser && allowedLocationIds.length > 0) {
          console.log("🔒 [DASHBOARD] Aplicando filtro de locais nas despesas");
          expensesQuery = expensesQuery.in("location_id", allowedLocationIds);
        }

        const { data: expensesData } = await expensesQuery;
        const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        console.log("✅ [DASHBOARD] Despesas carregadas:", {
          total: totalExpenses,
          count: expensesData?.length || 0
        });

        // 8. Formatar e setar os dados
        if (!isMounted) return;

        const formattedPayments: Payment[] = (paymentsData || []).map((payment: any) => ({
          id: payment.id,
          rentalId: payment.rental_id,
          propertyId: payment.property_id || "",
          tenantId: payment.tenant_id || "",
          dueDate: payment.due_date || payment.payment_date,
          expectedAmount: Number(payment.expected_amount),
          paidAmount: Number(payment.paid_amount),
          paymentDate: payment.payment_date,
          status: payment.status,
          referenceMonth: parseInt(payment.reference_month),
          referenceYear: parseInt(payment.reference_year),
          discount: Number(payment.discount || 0),
          lateFee: Number(payment.late_fee || 0),
          interest: Number(payment.interest || 0),
          notes: payment.notes || "",
          paymentMethod: payment.payment_method || "",
          receiptUrl: payment.receipt_url || "",
          type: "rent",
          rental: payment.rentals,
          property: payment.properties,
          tenant: payment.tenants,
          paymentTime: payment.payment_time || "",
        }));

        const formattedProperties: Property[] = (propertiesData || []).map((prop: any) => ({
          ...mapPropertyFromDB(prop),
          location: prop.locations?.name || "N/A",
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
          address: prop.locations ? `${prop.locations.street || ''}, ${prop.locations.number || ''} - ${prop.locations.neighborhood || ''}, ${prop.locations.city || ''}/${prop.locations.state || ''}` : "",
          features: prop.features || [],
          locationDetails: prop.locations,
          number: prop.number || prop.locations?.number || "",
          neighborhood: prop.neighborhood || prop.locations?.neighborhood || "",
          city: prop.city || prop.locations?.city || "",
          state: prop.state || prop.locations?.state || "",
          zipCode: prop.zip_code || prop.locations?.zip_code || "",
        }));

        setPayments(formattedPayments);
        setProperties(formattedProperties);
        setRentals(rentalsData?.map(mapRentalFromDB) || []);
        setTenantsCount(tenantsCount);
        setLocationExpenses(totalExpenses);

        console.log("✅ [DASHBOARD] Dados carregados com sucesso:", {
          payments: formattedPayments.length,
          properties: formattedProperties.length,
          rentals: rentalsData?.length || 0,
          tenants: tenantsCount,
          expenses: totalExpenses
        });

      } catch (error) {
        console.error("❌ [DASHBOARD] Erro ao carregar dados:", error);
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