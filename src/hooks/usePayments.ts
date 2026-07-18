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

      // Buscar APENAS payments regulares (tipo 1 - aluguel)
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
      if (paymentsError) {
        console.error("Erro ao buscar payments:", paymentsError);
        throw paymentsError;
      }

      console.log("Payments carregados:", paymentsData?.length || 0);
      console.log("Primeiro payment:", paymentsData?.[0]);

      // Processar payments regulares (aluguel)
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
        } as Payment;
      });

      console.log("Payments processados:", processedPayments.length);

      // Extrair rentals, properties, tenants únicos
      const uniqueRentals: Rental[] = [];
      const uniqueProperties: Property[] = [];
      const uniqueTenants: Tenant[] = [];

      processedPayments.forEach(payment => {
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

      console.log("Rentals únicos:", uniqueRentals.length);
      console.log("Properties únicos:", uniqueProperties.length);
      console.log("Tenants únicos:", uniqueTenants.length);

      setPayments(processedPayments);
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
      // Cancelar apenas payment regular (aluguel)
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
  }, [toast]);

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