import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";

// Cache em memória para evitar buscas repetidas
const cache = {
  rentals: new Map<string, Rental>(),
  properties: new Map<string, Property>(),
  tenants: new Map<string, Tenant>(),
  lastFetch: 0,
  TTL: 30000, // 30 segundos
};

export function usePayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Limpar cache se expirado
  const clearCacheIfExpired = () => {
    const now = Date.now();
    if (now - cache.lastFetch > cache.TTL) {
      cache.rentals.clear();
      cache.properties.clear();
      cache.tenants.clear();
    }
    cache.lastFetch = now;
  };

  // Buscar dados em lotes (batch)
  const fetchInBatches = async <T,>(
    table: string,
    ids: string[],
    select: string,
    batchSize: number = 20
  ): Promise<T[]> => {
    const results: T[] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from(table as any)
        .select(select)
        .in("id", batch);

      if (error) throw error;
      if (data) results.push(...(data as T[]));
    }

    return results;
  };

  const loadPayments = async (month?: string, year?: string) => {
    try {
      setLoading(true);
      clearCacheIfExpired();

      console.log("🔍 loadPayments chamado com filtros:", { month, year });

      // PASSO 1: Buscar apenas payments (query rápida)
      let query = supabase
        .from("payments")
        .select("id, rental_id, due_date, expected_amount, paid_amount, payment_date, status, payment_method, notes, reference_month, reference_year, attachments, late_fee, interest")
        .order("due_date", { ascending: true });

      // CRÍTICO: Aplicar filtros de mês/ano SEMPRE (nunca buscar tudo)
      if (month && month !== "all") {
        query = query.eq("reference_month", month);
        console.log("✅ Filtro de mês aplicado:", month);
      }
      if (year && year !== "all") {
        query = query.eq("reference_year", year);
        console.log("✅ Filtro de ano aplicado:", year);
      }

      const { data: paymentsData, error: paymentsError } = await query;

      if (paymentsError) throw paymentsError;

      console.log("📊 Payments retornados do banco:", paymentsData?.length || 0);

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        setRentals([]);
        setProperties([]);
        setTenants([]);
        setLoading(false);
        return;
      }

      // PASSO 2: Extrair rental IDs únicos
      const rentalIds = [...new Set(paymentsData.map(p => p.rental_id))];

      // PASSO 3: Buscar rentals em lotes (apenas campos essenciais)
      const rentalsData = await fetchInBatches<any>(
        "rentals",
        rentalIds,
        "id, property_id, tenant_id, monthly_rent, garage_value, status, start_date, end_date, payment_day, security_deposit",
        20 // Lotes de 20
      );

      // PASSO 4: Extrair property_ids e tenant_ids únicos
      const propertyIds = [...new Set(rentalsData.map(r => r.property_id))];
      const tenantIds = [...new Set(rentalsData.map(r => r.tenant_id))];

      // PASSO 5: Buscar properties e locations em lotes
      const propertiesData = await fetchInBatches<any>(
        "properties",
        propertyIds,
        "id, location_id, complement, rooms, bathrooms, area, status, value",
        30 // Lotes de 30
      );

      // PASSO 6: Buscar locations
      const locationIds = [...new Set(propertiesData.map(p => p.location_id))];
      const locationsData = await fetchInBatches<any>(
        "locations",
        locationIds,
        "id, name, street, number, neighborhood, city, state, zip_code",
        30
      );

      // PASSO 7: Buscar tenants em lotes
      const tenantsData = await fetchInBatches<any>(
        "tenants",
        tenantIds,
        "id, name, email, phone, document_type, document, cpf, rg, status",
        30
      );

      // PASSO 8: Criar maps para lookup rápido
      const locationsMap = new Map(locationsData.map(l => [l.id, l]));
      const propertiesMap = new Map(
        propertiesData.map(p => {
          const loc = locationsMap.get(p.location_id);
          return [
            p.id,
            {
              id: p.id,
              locationId: p.location_id,
              location: loc?.name || "",
              address: loc?.street || "",
              number: loc?.number || "",
              complement: p.complement || "",
              neighborhood: loc?.neighborhood || "",
              city: loc?.city || "",
              state: loc?.state || "",
              zipCode: loc?.zip_code || "",
              rooms: p.rooms || 0,
              bathrooms: p.bathrooms || 0,
              area: p.area || 0,
              status: (p.status as "available" | "occupied" | "unavailable") || "available",
              value: p.value,
            } as Property,
          ];
        })
      );

      const tenantsMap = new Map(
        tenantsData.map(t => [
          t.id,
          {
            id: t.id,
            name: t.name,
            email: t.email || "",
            phone: t.phone || "",
            documentType: (t.document_type as "cpf" | "cnpj") || "cpf",
            document: t.document || "",
            cpf: t.cpf || "",
            rg: t.rg || "",
            status: (t.status as "active" | "inactive" | "rented") || "active",
          } as Tenant,
        ])
      );

      const rentalsMap = new Map(
        rentalsData.map(r => [
          r.id,
          {
            id: r.id,
            propertyId: r.property_id,
            tenantId: r.tenant_id,
            startDate: r.start_date,
            endDate: r.end_date || "",
            paymentDay: r.payment_day,
            value: r.monthly_rent,
            depositAmount: r.security_deposit || 0,
            status: r.status as "active" | "inactive" | "terminated" | "pending",
            isActive: r.status === "active",
            attachments: [],
            contractAttachments: [],
            autoRenew: false,
          } as Rental,
        ])
      );

      // PASSO 9: Buscar contagem de pagamentos por rental em LOTE
      const { data: allCounts } = await supabase
        .from("payments")
        .select("rental_id")
        .in("rental_id", rentalIds);

      const paymentCountsByRental: Record<string, number> = {};
      allCounts?.forEach(p => {
        paymentCountsByRental[p.rental_id] = (paymentCountsByRental[p.rental_id] || 0) + 1;
      });

      // PASSO 10: Buscar histórico de pagamentos para calcular installment
      const { data: allHistoryPayments } = await supabase
        .from("payments")
        .select("id, rental_id, due_date")
        .in("rental_id", rentalIds)
        .order("due_date", { ascending: true });

      // PASSO 11: Mapear payments com numeração correta
      const paymentsMap: Payment[] = paymentsData.map(p => {
        const totalPayments = paymentCountsByRental[p.rental_id] || 0;
        const rentalHistory = allHistoryPayments?.filter(hp => hp.rental_id === p.rental_id) || [];
        
        // Verificar se há pagamento de rescisão no histórico
        const hasTerminationPayment = rentalHistory.some(hp => {
          const paymentNotes = paymentsData.find(pd => pd.id === hp.id)?.notes || "";
          return paymentNotes.includes("Rescisão de Contrato");
        });
        
        // Se for pagamento de rescisão, é sempre a última parcela
        const isTerminationPayment = p.notes?.includes("Rescisão de Contrato") || false;
        
        let installmentNumber: number;
        let totalInstallments: number;
        
        if (isTerminationPayment) {
          // Rescisão é sempre a última parcela
          installmentNumber = rentalHistory.length;
          totalInstallments = rentalHistory.length;
        } else if (hasTerminationPayment) {
          // Se existe rescisão, o total é o número de pagamentos até ela
          const terminationIndex = rentalHistory.findIndex(hp => {
            const paymentNotes = paymentsData.find(pd => pd.id === hp.id)?.notes || "";
            return paymentNotes.includes("Rescisão de Contrato");
          });
          installmentNumber = (rentalHistory.findIndex(hp => hp.id === p.id) || 0) + 1;
          totalInstallments = terminationIndex + 1;
        } else {
          // Cálculo normal
          installmentNumber = (rentalHistory.findIndex(hp => hp.id === p.id) || 0) + 1;
          totalInstallments = totalPayments;
        }

        return {
          id: p.id,
          rentalId: p.rental_id,
          dueDate: p.due_date,
          expectedAmount: p.expected_amount,
          paidAmount: p.paid_amount || 0,
          paymentDate: p.payment_date || undefined,
          status: p.status as "paid" | "pending" | "overdue" | "partial",
          paymentMethod: p.payment_method || undefined,
          notes: p.notes || undefined,
          referenceMonth: parseInt(p.reference_month),
          referenceYear: parseInt(p.reference_year),
          attachments: (p.attachments as unknown as string[]) || [],
          lateFee: p.late_fee || 0,
          interest: p.interest || 0,
          installment: installmentNumber,
          totalInstallments: totalInstallments,
        };
      });

      // Atualizar cache
      rentalsMap.forEach((v, k) => cache.rentals.set(k, v));
      propertiesMap.forEach((v, k) => cache.properties.set(k, v));
      tenantsMap.forEach((v, k) => cache.tenants.set(k, v));

      // Atualizar estados
      setPayments(paymentsMap);
      setRentals(Array.from(rentalsMap.values()));
      setProperties(Array.from(propertiesMap.values()));
      setTenants(Array.from(tenantsMap.values()));

      console.log("✅ Estados atualizados. Total de payments:", paymentsMap.length);

    } catch (error) {
      console.error("❌ Erro ao carregar pagamentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pagamentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
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

      await loadPayments();
    } catch (error) {
      console.error("Erro ao cancelar pagamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar pagamento",
        variant: "destructive",
      });
    }
  };

  const getPropertyInfo = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return null;
    return properties.find(p => p.id === rental.propertyId) || null;
  };

  const getTenantInfo = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return null;
    return tenants.find(t => t.id === rental.tenantId) || null;
  };

  const getExpectedAmount = (payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return payment.expectedAmount;
    return rental.value + (rental.depositAmount || 0);
  };

  const getPaymentInstallment = (payment: Payment) => {
    if (!payment.installment || !payment.totalInstallments) return null;
    return `${payment.installment}/${payment.totalInstallments}`;
  };

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
  };
}