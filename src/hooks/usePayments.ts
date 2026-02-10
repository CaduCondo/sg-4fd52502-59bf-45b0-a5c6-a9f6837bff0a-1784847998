import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";

export function usePayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async (month?: string, year?: string) => {
    try {
      // console.log("🔄 Carregando pagamentos...", { month, year });
      setLoading(true);

      // Query base
      let query = supabase
        .from("payments")
        .select(`
          *,
          rentals!inner (
            id,
            property_id,
            tenant_id,
            monthly_rent,
            garage_value,
            status,
            start_date,
            end_date,
            payment_day,
            security_deposit
          )
        `)
        .order("due_date", { ascending: true });

      // Otimização: Filtrar rentals ativos ou terminados recentemente
      // Removido .eq("rentals.status", "active") para mostrar pagamentos de contratos encerrados também

      // Aplicar filtros de mês/ano se fornecidos
      if (month && month !== "all") {
        query = query.eq("reference_month", month);
      }
      if (year && year !== "all") {
        query = query.eq("reference_year", year);
      }

      const { data: paymentsData, error: paymentsError } = await query;

      if (paymentsError) {
        console.error("❌ Erro ao carregar pagamentos:", paymentsError);
        throw paymentsError;
      }

      // console.log("✅ Pagamentos carregados:", paymentsData?.length || 0);

      // Carregar propriedades e inquilinos relacionados
      const rentalIds = [...new Set(paymentsData?.map(p => p.rental_id) || [])];
      
      if (rentalIds.length === 0) {
        setPayments([]);
        setRentals([]);
        setProperties([]);
        setTenants([]);
        setLoading(false);
        return;
      }

      // Buscar rentals com propriedades e inquilinos
      const { data: rentalsData, error: rentalsError } = await supabase
        .from("rentals")
        .select(`
          *,
          properties!inner (
            *,
            locations!inner (*)
          ),
          tenants!inner (*)
        `)
        .in("id", rentalIds);

      if (rentalsError) {
        console.error("❌ Erro ao carregar locações:", rentalsError);
        throw rentalsError;
      }

      // Mapear dados
      const rentalsMap: Rental[] = rentalsData?.map(r => ({
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
        autoRenew: false
      })) || [];

      const propertiesMap: Property[] = rentalsData?.map(r => {
        const prop = r.properties;
        const loc = prop.locations;
        return {
          id: prop.id,
          locationId: prop.location_id,
          location: loc?.name || "",
          address: loc?.street || "",
          number: loc?.number || "",
          complement: prop.complement || "",
          neighborhood: loc?.neighborhood || "",
          city: loc?.city || "",
          state: loc?.state || "",
          zipCode: loc?.zip_code || "",
          rooms: prop.rooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || 0,
          status: (prop.status as "available" | "occupied" | "unavailable") || "available",
          value: prop.value,
        };
      }) || [];

      const tenantsMap: Tenant[] = rentalsData?.map(r => ({
        id: r.tenants.id,
        name: r.tenants.name,
        email: r.tenants.email || "",
        phone: r.tenants.phone || "",
        documentType: (r.tenants.document_type as "cpf" | "cnpj") || "cpf",
        document: r.tenants.document || "",
        cpf: r.tenants.cpf || "",
        rg: r.tenants.rg || "",
        status: (r.tenants.status as "active" | "inactive" | "rented") || "active",
      })) || [];

      // Contar total de pagamentos por rental para calcular parcela correta
      // Buscar contagem real do banco para garantir consistência
      const paymentCountsByRental: Record<string, number> = {};
      
      // Buscar contagem em lote para evitar N+1 queries
      const { data: allCounts, error: countError } = await supabase
        .from("payments")
        .select("rental_id")
        .in("rental_id", rentalIds);

      if (!countError && allCounts) {
        allCounts.forEach(p => {
          paymentCountsByRental[p.rental_id] = (paymentCountsByRental[p.rental_id] || 0) + 1;
        });
      }

      // Buscar TODOS os pagamentos desses rentals para calcular a ordem correta
      // Isso é necessário porque paymentsData pode estar filtrado por mês/ano
      const { data: allHistoryPayments } = await supabase
        .from("payments")
        .select("id, rental_id, due_date")
        .in("rental_id", rentalIds)
        .order("due_date", { ascending: true });

      // Mapear payments com numeração correta
      const paymentsMap: Payment[] = paymentsData?.map(p => {
        const totalPayments = paymentCountsByRental[p.rental_id] || 0;
        
        // Calcular número da parcela baseado na posição cronológica global
        const rentalHistory = allHistoryPayments?.filter(hp => hp.rental_id === p.rental_id) || [];
        const installmentNumber = (rentalHistory.findIndex(hp => hp.id === p.id) || 0) + 1;

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
          totalInstallments: totalPayments,
        };
      }) || [];

      setPayments(paymentsMap);
      setRentals(rentalsMap);
      setProperties(propertiesMap);
      setTenants(tenantsMap);

    } catch (error) {
      console.error("❌ Erro ao carregar pagamentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pagamentos",
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

  useEffect(() => {
    loadPayments();
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
  };
}