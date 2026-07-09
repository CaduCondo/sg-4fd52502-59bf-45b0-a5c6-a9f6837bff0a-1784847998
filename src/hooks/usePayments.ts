import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";

export function usePayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = useCallback(async (month?: string, year?: string) => {
    try {
      setLoading(true);
      console.log(`🔄 [usePayments] Carregando recebimentos - mês: ${month}, ano: ${year}`);

      // Query DIRETA e SIMPLES - buscar payments com JOINs
      let query = supabase
        .from("payments")
        .select(`
          *,
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

      // Aplicar filtros de mês/ano SE fornecidos
      if (month && month !== "all") {
        const monthStr = month.toString().padStart(2, '0');
        query = query.eq("reference_month", monthStr);
      }
      if (year && year !== "all") {
        query = query.eq("reference_year", year.toString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ [usePayments] Erro ao carregar:", error);
        throw error;
      }

      console.log(`✅ [usePayments] Carregou ${data?.length || 0} recebimentos`);

      if (!data || data.length === 0) {
        setPayments([]);
        setRentals([]);
        setProperties([]);
        setTenants([]);
        return;
      }

      // Processar dados
      const rentalsMap = new Map<string, Rental>();
      const propertiesMap = new Map<string, Property>();
      const tenantsMap = new Map<string, Tenant>();

      const processedPayments: Payment[] = data.map((p: any) => {
        const rental = p.rentals;
        
        if (rental) {
          // Processar rental
          if (!rentalsMap.has(rental.id)) {
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
            });
          }

          // Processar property
          const property = rental.properties;
          if (property && !propertiesMap.has(property.id)) {
            const location = property.locations;
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
              propertyIdentifier: "",
              description: "",
              hasGarage: false,
              hasFurniture: false,
              acceptsPets: false,
              images: [],
              features: [],
              createdAt: new Date().toISOString(),
            });
          }

          // Processar tenant
          const tenant = rental.tenants;
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
              status: "rented",
            });
          }
        }

        return {
          id: p.id,
          rentalId: p.rental_id,
          propertyId: "",
          tenantId: "",
          dueDate: p.due_date,
          expectedAmount: p.expected_amount,
          paidAmount: p.paid_amount || 0,
          paymentDate: p.payment_date || undefined,
          status: p.status as "paid" | "pending" | "overdue" | "partial",
          paymentMethod: p.payment_method || "",
          notes: "",
          referenceMonth: parseInt(p.reference_month),
          referenceYear: parseInt(p.reference_year),
          attachments: p.attachments || [],
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

      // Atualizar estados DIRETAMENTE
      setPayments(processedPayments);
      setRentals(Array.from(rentalsMap.values()));
      setProperties(Array.from(propertiesMap.values()));
      setTenants(Array.from(tenantsMap.values()));

      console.log(`✅ [usePayments] Estados atualizados:`, {
        payments: processedPayments.length,
        rentals: rentalsMap.size,
        properties: propertiesMap.size,
        tenants: tenantsMap.size,
      });
    } catch (error: any) {
      console.error("❌ [usePayments] Erro:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar recebimentos. Tente novamente.",
        variant: "destructive",
      });
      
      // Limpar estados em caso de erro
      setPayments([]);
      setRentals([]);
      setProperties([]);
      setTenants([]);
    } finally {
      setLoading(false);
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
          attachments: [],
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recebimento cancelado com sucesso",
      });

      // Recarregar lista
      await loadPayments();
    } catch (error: any) {
      console.error("❌ Erro ao cancelar recebimento:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar recebimento. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast, loadPayments]);

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
    if (payment.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;
        
        if (Array.isArray(breakdownData) && breakdownData.length > 0) {
          const breakdownTotal = breakdownData.reduce((sum: number, item: any) => {
            return sum + (item.value || item.amount || 0);
          }, 0);
          
          return breakdownTotal + (payment.lateFee || 0) + (payment.interest || 0);
        }
        
        if (typeof breakdownData === 'object' && !Array.isArray(breakdownData)) {
          let breakdownTotal = 0;
          Object.values(breakdownData).forEach((value: any) => {
            if (value && typeof value === 'object') {
              breakdownTotal += (value.value || value.amount || 0);
            }
          });
          
          if (breakdownTotal > 0 || breakdownTotal < 0) {
            return breakdownTotal + (payment.lateFee || 0) + (payment.interest || 0);
          }
        }
      } catch (error) {
        console.error("Erro ao processar breakdown:", error);
      }
    }
    
    return payment.expectedAmount + (payment.lateFee || 0) + (payment.interest || 0);
  }, []);

  const getPaymentInstallment = useCallback((payment: Payment) => {
    if (!payment.installment || !payment.totalInstallments) {
      return "N/A";
    }
    
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
    fetchPayments: loadPayments,
  };
}

// Função auxiliar para invalidar cache (não faz nada agora, mas mantém compatibilidade)
export function invalidatePaymentsCache() {
  console.log("ℹ️ Cache de payments invalidado (sem efeito no novo código simplificado)");
}