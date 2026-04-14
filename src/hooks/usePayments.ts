import { useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";

// Cache em memória global
let paymentsCache: {
  data: {
    payments: Payment[];
    rentals: Rental[];
    properties: Property[];
    tenants: Tenant[];
  } | null;
  key: string;
  timestamp: number;
} = {
  data: null,
  key: "",
  timestamp: 0,
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// Invalidar cache
export const invalidatePaymentsCache = () => {
  paymentsCache = { data: null, key: "", timestamp: 0 };
  console.log("🗑️ [usePayments] Cache invalidado");
};

export function usePayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Prevenir múltiplas chamadas simultâneas
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPayments = useCallback(async (month?: string, year?: string) => {
    // Se já está carregando, cancela a requisição anterior
    if (loadingRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      abortControllerRef.current = new AbortController();

      // Invalidar cache para forçar reload com start_date
      const cacheKey = `${month || "all"}-${year || "all"}`;
      const now = Date.now();
      
      // Sempre buscar dados frescos se o cache está desatualizado
      if (
        paymentsCache.data &&
        paymentsCache.key === cacheKey &&
        (now - paymentsCache.timestamp) < CACHE_DURATION
      ) {
        console.log("✅ Usando cache - verificar se tem start_date:", paymentsCache.data.rentals[0]);
        setPayments(paymentsCache.data.payments);
        setRentals(paymentsCache.data.rentals);
        setProperties(paymentsCache.data.properties);
        setTenants(paymentsCache.data.tenants);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      console.log("🔄 Buscando dados FRESCOS do banco com start_date incluído...");

      // QUERY ÚNICA COM TODOS OS JOINS (SUPER OTIMIZADO!)
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
          payment_method,
          reference_month,
          reference_year,
          late_fee,
          interest,
          installment,
          total_installments,
          breakdown,
          attachments,
          rentals!payments_rental_id_fkey (
            id,
            property_id,
            tenant_id,
            rent_value,
            garage_value,
            has_garage,
            rent_due_day,
            deposit_value,
            start_date,
            end_date,
            properties!rentals_property_id_fkey (
              id,
              complement,
              rooms,
              bathrooms,
              area,
              status,
              value,
              locations!properties_location_id_fkey (
                id,
                name,
                street,
                number,
                neighborhood,
                city,
                state,
                zip_code
              )
            ),
            tenants!rentals_tenant_id_fkey (
              id,
              name,
              email,
              phone,
              document_type,
              document,
              cpf
            )
          )
        `)
        .order("due_date", { ascending: true });

      // Aplicar filtros de mês/ano
      if (month && month !== "all") {
        query = query.eq("reference_month", month);
      }
      if (year && year !== "all") {
        query = query.eq("reference_year", year);
      }

      const { data: paymentsData, error: paymentsError } = await query;

      // Verificar se foi cancelado
      if (abortControllerRef.current?.signal.aborted) {
        loadingRef.current = false;
        return;
      }

      if (paymentsError) {
        console.error("❌ [usePayments] Erro ao buscar:", paymentsError);
        throw paymentsError;
      }

      if (!paymentsData || paymentsData.length === 0) {
        console.log("ℹ️ [usePayments] Nenhum pagamento encontrado");
        setPayments([]);
        setRentals([]);
        setProperties([]);
        setTenants([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Processar dados (SUPER RÁPIDO - tudo já veio junto!)
      const rentalsMap = new Map<string, Rental>();
      const propertiesMap = new Map<string, Property>();
      const tenantsMap = new Map<string, Tenant>();

      const processedPayments: Payment[] = paymentsData.map((p: any) => {
        const rental = p.rentals;
        const property = rental?.properties;
        const location = property?.locations;
        const tenant = rental?.tenants;

        // Adicionar ao map de rentals
        if (rental && !rentalsMap.has(rental.id)) {
          rentalsMap.set(rental.id, {
            id: rental.id,
            propertyId: rental.property_id,
            tenantId: rental.tenant_id,
            value: rental.rent_value,
            monthlyRent: rental.rent_value,
            garageValue: rental.garage_value || 0,
            hasGarage: rental.has_garage || false,
            paymentDay: rental.rent_due_day,
            depositAmount: rental.deposit_value || 0,
            startDate: rental.start_date || "",
            endDate: rental.end_date || "",
            status: "active",
            isActive: true,
            attachments: [],
            contractAttachments: [],
            hasPartnerBroker: false,
            pixCode: "",
          } as Rental);
        }

        // Adicionar ao map de properties
        if (property && !propertiesMap.has(property.id)) {
          propertiesMap.set(property.id, {
            id: property.id,
            locationId: location?.id || "",
            location: location?.name || "",
            address: location?.street || "",
            number: location?.number || "",
            complement: property.complement || "",
            neighborhood: location?.neighborhood || "",
            city: location?.city || "",
            state: location?.state || "",
            zipCode: location?.zip_code || "",
            rooms: property.rooms || 0,
            bathrooms: property.bathrooms || 0,
            area: property.area || 0,
            status: property.status || "available",
            value: property.value || 0,
          } as Property);
        }

        // Adicionar ao map de tenants
        if (tenant && !tenantsMap.has(tenant.id)) {
          tenantsMap.set(tenant.id, {
            id: tenant.id,
            name: tenant.name || "",
            email: tenant.email || "",
            phone: tenant.phone || "",
            documentType: tenant.document_type || "cpf",
            document: tenant.document || "",
            cpf: tenant.cpf || "",
            rg: "",
            status: "active",
          } as Tenant);
        }

        // Processar attachments da tabela relacionada
        const attachmentsFromTable = p.payment_attachments || [];
        const processedAttachments = attachmentsFromTable.map((att: any) => ({
          url: att.file_url,
          name: att.file_name,
          description: att.description || "",
        }));

        return {
          id: p.id,
          rentalId: p.rental_id,
          propertyId: rental?.property_id || "",
          tenantId: rental?.tenant_id || "",
          dueDate: p.due_date,
          expectedAmount: p.expected_amount,
          paidAmount: p.paid_amount || 0,
          paymentDate: p.payment_date || undefined,
          status: p.status as "paid" | "pending" | "overdue" | "partial",
          paymentMethod: p.payment_method || "",
          notes: "",
          referenceMonth: parseInt(p.reference_month),
          referenceYear: parseInt(p.reference_year),
          attachments: processedAttachments.length > 0 ? processedAttachments : (p.attachments || []),
          lateFee: p.late_fee || 0,
          interest: p.interest || 0,
          installment: p.installment || undefined,
          totalInstallments: p.total_installments || undefined,
          discount: 0,
          receiptUrl: "",
          breakdown: p.breakdown || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const rentalsArray = Array.from(rentalsMap.values());
      const propertiesArray = Array.from(propertiesMap.values());
      const tenantsArray = Array.from(tenantsMap.values());

      // Atualizar cache
      paymentsCache = {
        data: {
          payments: processedPayments,
          rentals: rentalsArray,
          properties: propertiesArray,
          tenants: tenantsArray,
        },
        key: cacheKey,
        timestamp: now,
      };

      // Atualizar estados
      setPayments(processedPayments);
      setRentals(rentalsArray);
      setProperties(propertiesArray);
      setTenants(tenantsArray);

    } catch (error: any) {
      // Ignorar erros de cancelamento
      if (error.name === 'AbortError') {
        console.log("ℹ️ [usePayments] Requisição cancelada");
        return;
      }
      
      console.error("❌ [usePayments] Erro ao carregar pagamentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pagamentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [toast]);

  const handleCancelPayment = useCallback(async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "pending",
          payment_date: null,
          paid_amount: 0,
          payment_method: null,
          attachments: null,
          late_fee: 0,
          interest: 0,
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Invalidar cache
      invalidatePaymentsCache();

      toast({
        title: "Sucesso",
        description: "Pagamento cancelado com sucesso",
      });

    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao cancelar pagamento",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Helpers memoizados
  const getPropertyInfo = useCallback((rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return null;
    return properties.find(p => p.id === rental.propertyId) || null;
  }, [rentals, properties]);

  const getTenantInfo = useCallback((rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return null;
    return tenants.find(t => t.id === rental.tenantId) || null;
  }, [rentals, tenants]);

  const getExpectedAmount = useCallback((payment: Payment) => {
    return payment.expectedAmount;
  }, []);

  const getPaymentInstallment = useCallback((payment: Payment) => {
    if (!payment.installment || !payment.totalInstallments) return null;
    return `${payment.installment}/${payment.totalInstallments}`;
  }, []);

  return {
    payments,
    rentals,
    properties,
    tenants,
    loading,
    loadPayments,
    handleCancelPayment,
    getPropertyInfo,
    getTenantInfo,
    getExpectedAmount,
    getPaymentInstallment,
    fetchPayments: loadPayments, // Alias para compatibilidade
  };
}