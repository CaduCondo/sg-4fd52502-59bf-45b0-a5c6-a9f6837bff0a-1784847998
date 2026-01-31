import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Payment, Property, Rental } from "@/types";
import { checkUserPermission } from "@/lib/permissions";

export function useDashboardData(selectedPeriod: { month: number; year: number }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[] | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Verificar permissões do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const hasFullAccess = await checkUserPermission(user.id, 'payments', 'read');
      
      let locationIds: string[] | null = null;
      
      if (!hasFullAccess) {
        // Buscar locais permitidos para usuário financeiro
        const { data: permissions } = await supabase
          .from("user_location_permissions")
          .select("location_id")
          .eq("user_id", user.id);
        
        if (permissions && permissions.length > 0) {
          locationIds = permissions.map(p => p.location_id);
          setAllowedLocationIds(locationIds);
        } else {
          // Se não tem permissões, não mostra nada
          setAllowedLocationIds([]);
          setPayments([]);
          setProperties([]);
          setRentals([]);
          setLoading(false);
          return;
        }
      }

      // Buscar pagamentos do período
      const paymentsQuery = supabase
        .from("payments")
        .select("*")
        .eq("reference_month", selectedPeriod.month.toString())
        .eq("reference_year", selectedPeriod.year.toString());

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Buscar imóveis
      let propertiesQuery = supabase
        .from("properties")
        .select("*");
      
      if (locationIds) {
        propertiesQuery = propertiesQuery.in("location_id", locationIds);
      }

      const { data: propertiesData, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      // Buscar locações
      const rentalsQuery = supabase
        .from("rentals")
        .select("*")
        .eq("is_active", true);

      const { data: rentalsData, error: rentalsError } = await rentalsQuery;
      if (rentalsError) throw rentalsError;

      // Filtrar pagamentos e locações se necessário
      let filteredPayments = paymentsData || [];
      let filteredRentals = rentalsData || [];

      if (locationIds) {
        const allowedPropertyIds = (propertiesData || []).map(p => p.id);
        
        // Filtrar locações por imóveis permitidos
        filteredRentals = (rentalsData || []).filter(r => 
          allowedPropertyIds.includes(r.property_id)
        );
        
        // Filtrar pagamentos por locações permitidas
        const allowedRentalIds = filteredRentals.map(r => r.id);
        filteredPayments = (paymentsData || []).filter(p => 
          allowedRentalIds.includes(p.rental_id)
        );
      }

      setPayments(filteredPayments.map(mapPaymentFromDB));
      setProperties(propertiesData || []);
      setRentals(filteredRentals);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para mapear pagamentos do DB
  function mapPaymentFromDB(data: any): Payment {
    return {
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
    };
  }

  function mapPropertyFromDB(data: any): Property {
    return {
      id: data.id,
      address: data.address,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      zipCode: data.zip_code,
      value: Number(data.value),
      monthlyRent: Number(data.monthly_rent), // Fallback se value não existir
      description: data.description,
      area: Number(data.area),
      bathrooms: Number(data.bathrooms),
      garage: Number(data.garage_value),
      hasGarage: data.has_garage,
      acceptsPets: data.accepts_pets,
      hasFurniture: data.has_furniture,
      hasPartnerBroker: data.has_partner_broker,
      status: data.status,
      locationId: data.location_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Campos opcionais que podem não vir do banco diretamente dessa forma
      photos: data.photos || [],
      features: data.features || [],
    };
  }

  function mapRentalFromDB(data: any): Rental {
    return {
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
      // Campos de depósito
      depositInstallments: data.deposit_installments,
      depositInstallment1: data.deposit_installment_1,
      depositInstallment2: data.deposit_installment_2,
      depositInstallment3: data.deposit_installment_3,
      // Outros campos
      hasGarage: data.has_garage,
      garageValue: data.garage_value,
      hasPartnerBroker: data.has_partner_broker,
      contractAttachments: data.contract_attachments,
      attachments: data.attachments,
      autoRenew: false // Default
    };
  }

  return { 
    loading, 
    payments, 
    properties: properties.map(mapPropertyFromDB), 
    rentals: rentals.map(mapRentalFromDB), 
    allowedLocationIds 
  };
}