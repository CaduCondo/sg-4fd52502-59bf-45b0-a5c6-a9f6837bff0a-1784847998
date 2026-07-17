import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Payment, Rental, Property, Tenant } from "@/types";
import { getAllDepositInstallments } from "@/services/depositInstallmentService";

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const loadingRef = useRef(false);

  const loadPayments = useCallback(async (month: string = "all", year: string = "all") => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);

      // Buscar payments regulares (tipo 1 - aluguel)
      let paymentsQuery = supabase
        .from("payments")
        .select(`
          *,
          rentals!payments_rental_id_fkey (
            *,
            properties!rentals_property_id_fkey (*),
            tenants!rentals_tenant_id_fkey (*)
          )
        `);

      if (month !== "all") {
        paymentsQuery = paymentsQuery.eq("reference_month", month.padStart(2, "0"));
      }
      if (year !== "all") {
        paymentsQuery = paymentsQuery.eq("reference_year", year);
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Buscar deposit_installments (tipo 2 - caução)
      const depositInstallments = await getAllDepositInstallments();
      
      // Filtrar deposit_installments por mês/ano se necessário
      let filteredDeposits = depositInstallments;
      if (month !== "all" || year !== "all") {
        filteredDeposits = depositInstallments.filter(deposit => {
          const dueDate = new Date(deposit.due_date);
          const depositMonth = (dueDate.getMonth() + 1).toString().padStart(2, "0");
          const depositYear = dueDate.getFullYear().toString();
          
          const monthMatch = month === "all" || depositMonth === month.padStart(2, "0");
          const yearMatch = year === "all" || depositYear === year;
          
          return monthMatch && yearMatch;
        });
      }

      // Converter deposit_installments para formato Payment
      const depositPayments: (Payment | null)[] = await Promise.all(
        filteredDeposits.map(async (deposit) => {
          try {
            // Buscar dados da rental, property e tenant
            const { data: rentalData, error: rentalError } = await supabase
              .from("rentals")
              .select(`
                *,
                properties!rentals_property_id_fkey (*),
                tenants!rentals_tenant_id_fkey (*)
              `)
              .eq("id", deposit.rental_id)
              .single();

            // ✅ NULL SAFETY: Se não encontrou rental, retornar null (será filtrado depois)
            if (rentalError || !rentalData) {
              console.warn(`⚠️ Rental ${deposit.rental_id} não encontrado para deposit_installment ${deposit.id}`);
              return null;
            }

            const dueDate = new Date(deposit.due_date);
            const depositMonth = dueDate.getMonth() + 1;
            const depositYear = dueDate.getFullYear();

            return {
              id: deposit.id,
              rentalId: deposit.rental_id,
              propertyId: rentalData.property_id,
              tenantId: rentalData.tenant_id,
              referenceMonth: depositMonth,
              referenceYear: depositYear,
              dueDate: deposit.due_date,
              expectedAmount: deposit.amount,
              paidAmount: deposit.payment_date ? deposit.amount : 0,
              status: deposit.status as "pending" | "paid" | "overdue" | "partial",
              paymentDate: deposit.payment_date || null,
              paymentMethod: deposit.payment_method || null,
              notes: deposit.notes || null,
              lateFee: 0,
              interest: 0,
              breakdown: null,
              attachments: Array.isArray(deposit.attachments) 
                ? deposit.attachments.map((att: any) => typeof att === 'string' ? att : att?.url || '')
                : [],
              installment: deposit.installment_number,
              totalInstallments: deposit.total_installments,
              depositType: "deposit", // Flag para identificar tipo caução
            } as Payment;
          } catch (error) {
            console.error(`❌ Erro ao processar deposit_installment ${deposit.id}:`, error);
            return null;
          }
        })
      );

      // ✅ Remover nulls do array
      const validDepositPayments = depositPayments.filter(p => p !== null) as Payment[];

      // Processar payments regulares
      const processedPayments = (paymentsData || []).map((payment: any) => {
        const rental = payment.rentals;
        const property = rental?.properties;
        const tenant = rental?.tenants;

        return {
          id: payment.id,
          rentalId: payment.rental_id,
          propertyId: rental?.property_id || "",
          tenantId: rental?.tenant_id || "",
          referenceMonth: Number(payment.reference_month),
          referenceYear: Number(payment.reference_year),
          dueDate: payment.due_date,
          expectedAmount: payment.expected_amount,
          paidAmount: payment.paid_amount || 0,
          status: payment.status as "pending" | "paid" | "overdue" | "partial",
          paymentDate: payment.payment_date || null,
          paymentMethod: payment.payment_method || null,
          notes: payment.notes || null,
          lateFee: payment.late_fee || 0,
          interest: payment.interest || 0,
          breakdown: payment.breakdown,
          attachments: payment.attachments || [],
          installment: payment.installment || 1,
          totalInstallments: payment.total_installments || 24,
          pixCode: payment.pix_code,
          paymentTime: payment.payment_time,
          rental: rental ? {
            id: rental.id,
            propertyId: rental.property_id,
            property_id: rental.property_id,
            tenantId: rental.tenant_id,
            tenant_id: rental.tenant_id,
            startDate: rental.start_date,
            start_date: rental.start_date,
            endDate: rental.end_date,
            end_date: rental.end_date,
            value: rental.rent_value || 0,
            monthlyRent: rental.rent_value || 0,
            monthly_rent: rental.rent_value || 0,
            paymentDay: rental.rent_due_day || 10,
            depositAmount: rental.security_deposit || 0,
            deposit_amount: rental.security_deposit || 0,
            security_deposit: rental.security_deposit || 0,
            status: rental.status as "active" | "ended" | "terminated",
            isActive: rental.status === "active",
            is_active: rental.status === "active",
            attachments: [],
            contractAttachments: [],
            contract_attachments: [],
            hasGarage: rental.has_garage || false,
            has_garage: rental.has_garage || false,
            garageValue: rental.garage_value || 0,
            garage_value: rental.garage_value || 0,
            hasPartnerBroker: false,
            has_partner_broker: false,
            installments: 24,
            totalInstallments: 24,
          } : undefined,
          property: property ? {
            id: property.id,
            locationId: property.location_id,
            location_id: property.location_id,
            location: property.location || "",
            propertyIdentifier: property.property_identifier || "",
            property_identifier: property.property_identifier || "",
            complement: property.complement || "",
            description: property.description || "",
            rooms: property.rooms || 0,
            bathrooms: property.bathrooms || 0,
            area: property.area || 0,
            value: property.value || 0,
            hasGarage: property.has_garage || false,
            has_garage: property.has_garage || false,
            hasFurniture: property.has_furniture || false,
            has_furniture: property.has_furniture || false,
            acceptsPets: property.accepts_pets || false,
            accepts_pets: property.accepts_pets || false,
            status: property.status as "available" | "occupied" | "unavailable",
            images: [],
            createdAt: property.created_at,
            created_at: property.created_at,
            address: "",
            features: [],
            type: "apartment" as const,
            monthlyRent: 0,
            number: "",
            neighborhood: "",
            city: "",
            state: "",
            zipCode: "",
          } : undefined,
          tenant: tenant ? {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            cpf: tenant.cpf || tenant.document || "",
            rg: tenant.rg || "",
            createdAt: tenant.created_at,
            document: tenant.document || tenant.cpf || "",
            status: tenant.status as "new" | "inactive" | "rented",
          } : undefined,
          depositType: "rent", // Flag para identificar tipo aluguel
        } as Payment;
      });

      // Unificar payments regulares com deposit installments
      const allPayments = [...processedPayments, ...validDepositPayments];

      // Extrair rentals, properties, tenants únicos
      const uniqueRentals: Rental[] = [];
      const uniqueProperties: Property[] = [];
      const uniqueTenants: Tenant[] = [];

      allPayments.forEach(payment => {
        if (payment.rental && !uniqueRentals.find(r => r.id === payment.rental!.id)) {
          uniqueRentals.push(payment.rental);
        }
        if (payment.property && !uniqueProperties.find(p => p.id === payment.property!.id)) {
          uniqueProperties.push(payment.property);
        }
        if (payment.tenant && !uniqueTenants.find(t => t.id === payment.tenant!.id)) {
          uniqueTenants.push(payment.tenant);
        }
      });

      setPayments(allPayments);
      setRentals(uniqueRentals);
      setProperties(uniqueProperties);
      setTenants(uniqueTenants);

    } catch (error) {
      console.error("Error loading payments:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar recebimentos",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [toast]);

  const handleCancelPayment = useCallback(async (paymentId: string) => {
    try {
      // Verificar se é deposit_installment ou payment regular
      const payment = payments.find(p => p.id === paymentId);
      
      if (payment?.depositType === "deposit") {
        // Cancelar deposit_installment
        const { error } = await supabase
          .from("deposit_installments")
          .update({
            status: "pending",
            payment_date: null,
            payment_method: null,
            notes: null,
            attachments: null,
          })
          .eq("id", paymentId);

        if (error) throw error;
      } else {
        // Cancelar payment regular
        const { error } = await supabase
          .from("payments")
          .update({
            status: "pending",
            payment_date: null,
            payment_time: null,
            paid_amount: 0,
            payment_method: null,
            attachments: null,
          })
          .eq("id", paymentId);

        if (error) throw error;
      }

      toast({
        title: "Recebimento cancelado",
        description: "O recebimento foi cancelado com sucesso.",
      });

    } catch (error) {
      console.error("Error canceling payment:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cancelar recebimento",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
      });
      throw error;
    }
  }, [payments, toast]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return {
    payments,
    rentals,
    properties,
    tenants,
    loading,
    handleCancelPayment,
    loadPayments,
  };
};