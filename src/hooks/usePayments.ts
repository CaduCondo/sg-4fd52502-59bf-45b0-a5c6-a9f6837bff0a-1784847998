import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";

// Cache em memória para evitar buscas repetidas (30 segundos TTL)
const cache = {
  data: new Map<string, any>(),
  lastFetch: 0,
  TTL: 30000,
};

// Limpar cache se expirado
const clearCacheIfExpired = () => {
  const now = Date.now();
  if (now - cache.lastFetch > cache.TTL) {
    cache.data.clear();
  }
  cache.lastFetch = now;
};

export function usePayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // OTIMIZAÇÃO: Queries com JOIN para reduzir round-trips ao banco
  const loadPayments = useCallback(async (month?: string, year?: string) => {
    try {
      setLoading(true);
      clearCacheIfExpired();

      // Cache key para evitar queries duplicadas
      const cacheKey = `payments_${month}_${year}`;
      const cached = cache.data.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cache.TTL) {
        console.log("📦 Using cached payments data");
        setPayments(cached.payments);
        setRentals(cached.rentals);
        setProperties(cached.properties);
        setTenants(cached.tenants);
        setLoading(false);
        return;
      }

      // QUERY ÚNICA COM JOINS - Muito mais rápido que queries em cascata
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
          notes,
          reference_month,
          reference_year,
          attachments,
          late_fee,
          interest,
          installment,
          total_installments,
          breakdown,
          rental:rentals!inner(
            id,
            property_id,
            tenant_id,
            value,
            garage_value,
            status,
            start_date,
            end_date,
            payment_day,
            security_deposit,
            property:properties!inner(
              id,
              location_id,
              complement,
              rooms,
              bathrooms,
              area,
              status,
              value,
              location:locations!inner(
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
            tenant:tenants!inner(
              id,
              name,
              email,
              phone,
              document_type,
              document,
              cpf,
              rg,
              status
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

      if (paymentsError) throw paymentsError;

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        setRentals([]);
        setProperties([]);
        setTenants([]);
        setLoading(false);
        return;
      }

      // OTIMIZAÇÃO: Processar dados em um único loop
      const rentalsMap = new Map<string, Rental>();
      const propertiesMap = new Map<string, Property>();
      const tenantsMap = new Map<string, Tenant>();

      const paymentsProcessed: Payment[] = paymentsData.map((p: any) => {
        const rental = p.rental;
        const property = rental.property;
        const location = property.location;
        const tenant = rental.tenant;

        // Construir objetos apenas uma vez
        if (!rentalsMap.has(rental.id)) {
          rentalsMap.set(rental.id, {
            id: rental.id,
            propertyId: rental.property_id,
            tenantId: rental.tenant_id,
            startDate: rental.start_date,
            endDate: rental.end_date || "",
            paymentDay: rental.payment_day,
            value: rental.value,
            depositAmount: rental.security_deposit || 0,
            status: (rental.status === "active" ? "active" : rental.status === "terminated" ? "terminated" : "ended"),
            isActive: rental.status === "active",
            attachments: [],
            contractAttachments: [],
            autoRenew: false,
            // Propriedades adicionais para satisfazer a interface
            garageValue: rental.garage_value || 0,
            hasGarage: false, // Valor padrão
            notes: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        if (!propertiesMap.has(property.id)) {
          propertiesMap.set(property.id, {
            id: property.id,
            locationId: property.location_id,
            location: location.name || "",
            address: location.street || "",
            number: location.number || "",
            complement: property.complement || "",
            neighborhood: location.neighborhood || "",
            city: location.city || "",
            state: location.state || "",
            zipCode: location.zip_code || "",
            rooms: property.rooms || 0,
            bathrooms: property.bathrooms || 0,
            area: property.area || 0,
            status: (property.status as "available" | "occupied" | "unavailable") || "available",
            value: property.value,
            // Propriedades adicionais para satisfazer a interface
            propertyIdentifier: property.id.substring(0, 8), // Valor derivado se não existir
            description: "",
            hasGarage: false,
            hasFurniture: false,
            hasPartyHall: false,
            hasCourt: false,
            hasGym: false,
            hasPool: false,
            hasElevator: false,
            images: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        if (!tenantsMap.has(tenant.id)) {
          tenantsMap.set(tenant.id, {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email || "",
            phone: tenant.phone || "",
            documentType: (tenant.document_type as "cpf" | "cnpj") || "cpf",
            document: tenant.document || "",
            cpf: tenant.cpf || "",
            rg: tenant.rg || "",
            status: (tenant.status as "active" | "inactive" | "rented") || "active",
          });
        }

        return {
          id: p.id,
          rentalId: p.rental_id,
          propertyId: rental.property_id,
          tenantId: rental.tenant_id,
          dueDate: p.due_date,
          expectedAmount: p.expected_amount,
          paidAmount: p.paid_amount || 0,
          paymentDate: p.payment_date || undefined,
          status: p.status as "paid" | "pending" | "overdue" | "partial",
          paymentMethod: p.payment_method || "",
          notes: p.notes || "",
          referenceMonth: parseInt(p.reference_month),
          referenceYear: parseInt(p.reference_year),
          attachments: (p.attachments as unknown as string[]) || [],
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

      // Salvar no cache
      cache.data.set(cacheKey, {
        payments: paymentsProcessed,
        rentals: rentalsArray,
        properties: propertiesArray,
        tenants: tenantsArray,
        timestamp: Date.now(),
      });

      setPayments(paymentsProcessed);
      setRentals(rentalsArray);
      setProperties(propertiesArray);
      setTenants(tenantsArray);

    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pagamentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // OTIMIZAÇÃO: Memoizar callbacks para evitar re-renders
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

  // OTIMIZAÇÃO: Criar Maps para lookup O(1) ao invés de find O(n)
  const rentalsMap = useMemo(() => 
    new Map(rentals.map(r => [r.id, r])),
    [rentals]
  );

  const propertiesMap = useMemo(() => 
    new Map(properties.map(p => [p.id, p])),
    [properties]
  );

  const tenantsMap = useMemo(() => 
    new Map(tenants.map(t => [t.id, t])),
    [tenants]
  );

  const getPropertyInfo = useCallback((rentalId: string) => {
    const rental = rentalsMap.get(rentalId);
    if (!rental) return null;
    return propertiesMap.get(rental.propertyId) || null;
  }, [rentalsMap, propertiesMap]);

  const getTenantInfo = useCallback((rentalId: string) => {
    const rental = rentalsMap.get(rentalId);
    if (!rental) return null;
    return tenantsMap.get(rental.tenantId) || null;
  }, [rentalsMap, tenantsMap]);

  const getExpectedAmount = useCallback((payment: Payment) => {
    const rental = rentalsMap.get(payment.rentalId);
    if (!rental) return payment.expectedAmount;
    return rental.value + (rental.depositAmount || 0);
  }, [rentalsMap]);

  const getPaymentInstallment = useCallback((payment: Payment) => {
    if (!payment.installment || !payment.totalInstallments) return null;
    return `${payment.installment}/${payment.totalInstallments}`;
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          rental_id,
          expected_amount,
          paid_amount,
          due_date,
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
          installment,
          total_installments,
          rental:rentals(
            id,
            monthly_rent,
            garage_value,
            has_garage,
            payment_day,
            start_date,
            end_date,
            properties(id, property_identifier, location_id, complement),
            tenants(id, name, cpf, email, phone)
          )
        `)
        .order("reference_year", { ascending: false })
        .order("reference_month", { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedPayments: Payment[] = (data || []).map((payment: any) => ({
        id: payment.id,
        rentalId: payment.rental_id,
        expectedAmount: payment.expected_amount,
        paidAmount: payment.paid_amount,
        dueDate: payment.due_date,
        paymentDate: payment.payment_date,
        status: payment.status,
        referenceMonth: Number(payment.reference_month),
        referenceYear: Number(payment.reference_year),
        discount: payment.discount_amount,
        lateFee: payment.late_fee,
        interest: payment.interest,
        notes: payment.notes,
        paymentMethod: payment.payment_method,
        breakdown: payment.breakdown,
        installment: payment.installment,
        totalInstallments: payment.total_installments,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        rental: payment.rental,
        property: payment.rental?.properties,
        tenant: payment.rental?.tenants,
        propertyId: payment.rental?.properties?.id || "",
        tenantId: payment.rental?.tenants?.id || "",
      }));

      setPayments(formattedPayments);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar pagamentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
    fetchPayments,
  };
}