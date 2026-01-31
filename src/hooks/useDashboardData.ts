import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Payment, Property, Rental } from "@/types";

export function useDashboardData(month: number, year: number) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);

  // Memoizar as funções de mapeamento para evitar recriação
  const mapPaymentFromDB = useCallback((data: any): Payment => {
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
  }, []);

  const mapPropertyFromDB = useCallback((data: any): Property => {
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
      monthlyRent: Number(data.monthly_rent),
      description: data.description,
      area: Number(data.area),
      bathrooms: Number(data.bathrooms),
      hasGarage: data.has_garage,
      acceptsPets: data.accepts_pets,
      hasFurniture: data.has_furniture,
      hasPartnerBroker: data.has_partner_broker,
      status: data.status,
      locationId: data.location_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      images: data.photos || [],
    };
  }, []);

  const mapRentalFromDB = useCallback((data: any): Rental => {
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
      depositInstallments: data.deposit_installments,
      depositInstallment1: data.deposit_installment_1,
      depositInstallment2: data.deposit_installment_2,
      depositInstallment3: data.deposit_installment_3,
      hasGarage: data.has_garage,
      garageValue: data.garage_value,
      hasPartnerBroker: data.has_partner_broker,
      contractAttachments: data.contract_attachments,
      attachments: data.attachments,
      autoRenew: false
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        
        console.log("🔄 Dashboard: Carregando dados...", { month, year });

        // Buscar pagamentos do período
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("reference_month", month.toString())
          .eq("reference_year", year.toString());

        if (paymentsError) {
          console.error("Erro ao buscar pagamentos:", paymentsError);
        }

        // Buscar imóveis
        const { data: propertiesData, error: propertiesError } = await supabase
          .from("properties")
          .select("*");

        if (propertiesError) {
          console.error("Erro ao buscar imóveis:", propertiesError);
        }

        // Buscar locações
        const { data: rentalsData, error: rentalsError } = await supabase
          .from("rentals")
          .select("*")
          .eq("is_active", true);

        if (rentalsError) {
          console.error("Erro ao buscar locações:", rentalsError);
        }

        if (isMounted) {
          setPayments((paymentsData || []).map(mapPaymentFromDB));
          setProperties((propertiesData || []).map(mapPropertyFromDB));
          setRentals((rentalsData || []).map(mapRentalFromDB));
          console.log("✅ Dashboard: Dados carregados com sucesso");
        }
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
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
  }, [month, year, mapPaymentFromDB, mapPropertyFromDB, mapRentalFromDB]);

  return { loading, payments, properties, rentals };
}